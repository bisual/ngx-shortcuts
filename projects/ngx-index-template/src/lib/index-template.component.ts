import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

export interface IndexPageEvent {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export interface IndexSortEvent {
  readonly active: string;
}

type FilterValues = Record<string, unknown>;

@Component({
  selector: 'index-template-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
})
export class IndexTemplateComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly router = inject(Router);
  protected readonly formBuilder = inject(FormBuilder);
  protected readonly activatedRoute = inject(ActivatedRoute);

  readonly noFetchFields = input<readonly string[]>([]);
  readonly queryParameters = toSignal(this.activatedRoute.queryParams, {
    initialValue: this.activatedRoute.snapshot.queryParams,
  });
  displayedColumns: string[] = [];
  length = 0;
  pageSize = 10;
  pageSizeOptions: readonly number[] = [5, 10, 20, 50];
  pageIndex = 1;
  sorting: { order_by: string | null } = { order_by: null };
  debounceTimeInMs = 200;

  filterForm: FormGroup = this.formBuilder.group({});
  formPersistence: FilterValues | null = null;
  filterFormExtraParams: FilterValues = {};

  serializer: Record<string, () => unknown> = {};
  deserializer: Record<string, (data: string) => unknown> = {};

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
        takeUntilDestroyed(this.destroyRef),
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

        void this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: data,
          queryParamsHandling: 'merge',
        });
      });
  }

  private listenQueryParameters(): void {
    this.activatedRoute.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const previousParams = this.formPersistence ?? {};
        const currentParams: FilterValues = { ...params };
        const fieldsChanged = Object.keys(currentParams).filter(
          key => previousParams[key] !== currentParams[key],
        );
        const noFetchTriggered =
          fieldsChanged.length === 1 &&
          fieldsChanged.some(field => this.noFetchFields().includes(field));

        if (!this.valuesEqual(currentParams, this.filterForm.getRawValue())) {
          const normalizedParams: FilterValues = { ...currentParams };

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
    };
    this.filterForm.patchValue({
      order_by: event.active,
    });
  }

  setMetadata(length: number, currentPage: number, pageSize: number): void {
    this.length = length;
    this.pageIndex = currentPage;
    this.pageSize = pageSize;
  }

  private initFilterForm(): void {
    const queryParams = this.activatedRoute.snapshot.queryParamMap;

    this.filterForm = this.formBuilder.group({
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
      ...this.filterFormExtraParams,
    });
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
    return (
      left === right ||
      (left != null &&
        right != null &&
        !Array.isArray(left) &&
        !Array.isArray(right) &&
        String(left) === String(right))
    );
  }
}
