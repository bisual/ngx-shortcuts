import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  Signal,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { UtilsService } from './services/utils.service';

export interface IndexPageEvent {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export type IndexSortDirection = 'asc' | 'desc' | '';

export interface IndexSortEvent {
  readonly active: string;
  readonly direction?: IndexSortDirection;
}

type FilterValues = Record<string, unknown>;

/**
 * Constructor keeps `(router, fb, activatedRoute, utils)` for existing apps.
 *
 * Those names are NOT declared as class fields on purpose: subclasses that do
 * `constructor(private router: Router, private fb: …) { super(...) }` must keep
 * compiling (no TS2415 / TS4115). Values are stored in `#…` fields and also
 * assigned on the instance at runtime for legacy `this.fb` access.
 */
@Component({
  selector: 'index-template-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
})
export class IndexTemplateComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  #router: Router;
  #fb: FormBuilder;
  #activatedRoute: ActivatedRoute;
  #utils: UtilsService;

  /** Typed access to the FormBuilder passed into the constructor. */
  protected get formBuilder(): FormBuilder {
    return this.#fb;
  }

  readonly queryParameters: Signal<Params>;

  @Input() noFetchFields: string[] = [];
  displayedColumns: string[] = [];
  length = 0;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  pageIndex = 1;
  sorting: {
    order_by: string | null;
    order_by_direction?: IndexSortDirection;
  } = { order_by: null };
  debounceTimeInMs = 200;

  filterForm: FormGroup;
  formPersistence: FilterValues | null = null;
  filterFormExtraParams: FilterValues = {};

  serializer: Record<string, () => unknown> = {};
  deserializer: Record<string, (data: string) => unknown> = {};

  constructor(
    router: Router,
    fb: FormBuilder,
    activatedRoute: ActivatedRoute,
    utils: UtilsService,
  ) {
    this.#router = router;
    this.#fb = fb;
    this.#activatedRoute = activatedRoute;
    this.#utils = utils;
    Object.assign(this, { router, fb, activatedRoute, utils });

    this.queryParameters = toSignal(this.#activatedRoute.queryParams, {
      initialValue: this.#activatedRoute.snapshot.queryParams,
    });
    this.filterForm = this.createDefaultFilterForm();
  }

  ngOnInit(): void {
    this.initFilterForm();
    this.initFilterFormListener();
    this.listenQueryParameters();
  }

  fetchData(): void {}

  private initFilterFormListener(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(this.debounceTimeInMs),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(value => {
        const data: FilterValues = {
          ...value,
          per_page: Number(value['per_page']),
        };
        const previous = this.formPersistence;

        if (previous !== null && this.valuesEqual(previous, data)) {
          return;
        }

        if (
          previous !== null &&
          !this.valuesEquivalent(previous['per_page'], data['per_page']) &&
          this.valuesEquivalent(data['page'], previous['page']) &&
          previous['page'] != null
        ) {
          data['page'] = 1;
        }

        for (const [key, serialize] of Object.entries(this.serializer)) {
          data[key] = serialize();
        }

        if (data['order_by_direction'] === '' || data['order_by_direction'] == null) {
          data['order_by_direction'] = null;
        }

        void this.#router.navigate([], {
          relativeTo: this.#activatedRoute,
          queryParams: data,
          queryParamsHandling: 'merge',
        });
      });
  }

  private listenQueryParameters(): void {
    this.#activatedRoute.queryParams
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(params => {
        const previousParams = this.formPersistence ?? {};
        const currentParams: FilterValues = { ...params };
        const fieldsChanged = Object.keys(currentParams).filter(
          key => !this.valuesEquivalent(previousParams[key], currentParams[key]),
        );
        const noFetchTriggered =
          fieldsChanged.length === 1 &&
          fieldsChanged.some(field => this.noFetchFields.includes(field));

        if (!this.valuesEqual(currentParams, this.filterForm.getRawValue())) {
          const normalizedParams: FilterValues = this.#utils.cloneObj(currentParams);

          for (const key of Object.keys(normalizedParams)) {
            const value = normalizedParams[key];

            if (key in this.deserializer && typeof value === 'string') {
              normalizedParams[key] = this.deserializer[key](value);
            } else if (
              value != null &&
              value !== '' &&
              typeof value === 'string' &&
              !Number.isNaN(Number(value))
            ) {
              normalizedParams[key] = Number(value);
            }
          }

          if (this.formPersistence !== null) {
            const filterChanged = Object.keys(this.filterForm.controls).some(
              key =>
                key !== 'page' &&
                !this.valuesEquivalent(
                  this.formPersistence?.[key],
                  normalizedParams[key],
                ),
            );

            if (filterChanged) {
              normalizedParams['page'] = 1;
            }
          }

          this.filterForm.patchValue(normalizedParams, { emitEvent: false });
        }

        this.formPersistence = currentParams;
        if (!noFetchTriggered) {
          this.fetchData();
        }
      });
  }

  changePage(event: IndexPageEvent): void {
    this.filterForm.patchValue({
      page: event.pageIndex + 1,
      per_page: event.pageSize,
    });
  }

  sortChange(event: IndexSortEvent): void {
    this.sorting = {
      order_by: event.active,
      ...(event.direction != null ? { order_by_direction: event.direction } : {}),
    };

    const patch: FilterValues = { order_by: event.active };

    if (event.direction != null && event.direction !== '') {
      if (!this.filterForm.contains('order_by_direction')) {
        this.filterForm.addControl(
          'order_by_direction',
          this.#fb.control(event.direction),
        );
      }
      patch['order_by_direction'] = event.direction;
    }

    this.filterForm.patchValue(patch);
  }

  setMetadata(length: number, currentPage: number, pageSize: number): void {
    this.length = length;
    this.pageIndex = currentPage;
    this.pageSize = pageSize;
  }

  private createDefaultFilterForm(): FormGroup {
    return this.#fb.group(this.buildFilterFormControls());
  }

  private initFilterForm(): void {
    this.filterForm = this.#fb.group({
      ...this.buildFilterFormControls(),
      ...this.filterFormExtraParams,
    });
  }

  private buildFilterFormControls(): Record<string, unknown> {
    const queryParams = this.#activatedRoute.snapshot.queryParamMap;
    const controls: Record<string, unknown> = {
      search: [queryParams.get('search') ?? '', Validators.minLength(3)],
      per_page: [
        this.numberParam(queryParams.get('per_page'), this.pageSize),
        Validators.required,
      ],
      page: [
        this.numberParam(queryParams.get('page'), this.pageIndex),
        Validators.required,
      ],
      order_by: [queryParams.get('order_by') ?? this.sorting.order_by],
    };

    const orderByDirection =
      queryParams.get('order_by_direction') ?? this.sorting.order_by_direction;

    if (orderByDirection != null && orderByDirection !== '') {
      controls['order_by_direction'] = [orderByDirection];
    }

    return controls;
  }

  private numberParam(value: string | null, fallback: number): number {
    const parsedValue = Number(value);
    return value === null || !Number.isFinite(parsedValue) ? fallback : parsedValue;
  }

  private valuesEqual(left: FilterValues, right: FilterValues): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(key => this.valuesEquivalent(left[key], right[key]))
    );
  }

  private valuesEquivalent(left: unknown, right: unknown): boolean {
    if (left === right) {
      return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every((item, index) => this.valuesEquivalent(item, right[index]))
      );
    }

    return (
      left != null &&
      right != null &&
      !Array.isArray(left) &&
      !Array.isArray(right) &&
      String(left) === String(right)
    );
  }
}
