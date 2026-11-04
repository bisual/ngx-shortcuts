import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { IndexTemplateComponent } from './index-template.component';
import { UtilsService } from './services/utils.service';

type ValuesEquivalent = (left: unknown, right: unknown) => boolean;

function valuesEquivalentOf(component: IndexTemplateComponent): ValuesEquivalent {
  return (component as unknown as { valuesEquivalent: ValuesEquivalent }).valuesEquivalent.bind(
    component,
  );
}

async function createIndex(
  queryParams: Record<string, string> = {},
  options: { detectChanges?: boolean } = {},
): Promise<{
  component: IndexTemplateComponent;
  fixture: ReturnType<typeof TestBed.createComponent<IndexTemplateComponent>>;
  queryParams$: BehaviorSubject<Record<string, string>>;
  router: Router;
}> {
  const queryParams$ = new BehaviorSubject<Record<string, string>>(queryParams);

  await TestBed.configureTestingModule({
    imports: [IndexTemplateComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParams,
            queryParamMap: convertToParamMap(queryParams),
          },
          queryParams: queryParams$.asObservable(),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(IndexTemplateComponent);
  const component = fixture.componentInstance;
  component.debounceTimeInMs = 0;

  if (options.detectChanges !== false) {
    fixture.detectChanges();
  }

  return {
    component,
    fixture,
    queryParams$,
    router: TestBed.inject(Router),
  };
}

function flushDebounce(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('IndexTemplateComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates the default filter form without order_by_direction', async () => {
    const { component, fixture } = await createIndex({}, { detectChanges: false });
    const fetchData = vi.spyOn(component, 'fetchData');

    fixture.detectChanges();

    expect(component.filterForm.getRawValue()).toEqual({
      search: '',
      per_page: 10,
      page: 1,
      order_by: null,
    });
    expect(component.filterForm.contains('order_by_direction')).toBe(false);
    expect(fetchData).toHaveBeenCalledOnce();
  });

  it('starts at pageIndex 0 (mat-paginator 0-based)', async () => {
    const { component } = await createIndex();

    expect(component.pageIndex).toBe(0);
    expect(component.filterForm.get('page')?.value).toBe(1);
  });

  it('maps changePage pageIndex to 1-based form page', async () => {
    const { component } = await createIndex();

    component.changePage({ pageIndex: 2, pageSize: 20 });

    expect(component.pageIndex).toBe(2);
    expect(component.pageSize).toBe(20);
    expect(component.filterForm.get('page')?.value).toBe(3);
    expect(component.filterForm.get('per_page')?.value).toBe(20);
  });

  it('syncs pageIndex from ?page=3 as 0-based index 2', async () => {
    const { component } = await createIndex({ page: '3' });

    expect(component.filterForm.get('page')?.value).toBe(3);
    expect(component.pageIndex).toBe(2);
  });

  it('does not reset to page 1 on the first pagination with a clean URL', async () => {
    const { component, router } = await createIndex();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fetchData = vi.spyOn(component, 'fetchData');

    fetchData.mockClear();
    component.changePage({ pageIndex: 1, pageSize: 10 });
    await flushDebounce();

    expect(component.filterForm.get('page')?.value).toBe(2);
    expect(component.pageIndex).toBe(1);
    expect(navigate).toHaveBeenCalled();
    const navigatedParams = navigate.mock.calls.at(-1)?.[1]?.queryParams as Record<
      string,
      unknown
    >;
    expect(navigatedParams['page']).toBe(2);
  });

  it('treats blank search as equivalent so sparse URL does not look like a filter change', async () => {
    const { component, queryParams$, router } = await createIndex();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fetchData = vi.spyOn(component, 'fetchData');

    // Simulate router omitting empty search after a page change.
    fetchData.mockClear();
    navigate.mockClear();
    queryParams$.next({ page: '2', per_page: '10' });

    expect(component.filterForm.get('page')?.value).toBe(2);
    expect(component.pageIndex).toBe(1);
    expect(component.filterForm.get('search')?.value).toBe('');
    expect(navigate).not.toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: 1 } }),
    );
  });

  it('resets to page 1 when filters change while URL has ?page=5', async () => {
    const { component, queryParams$, router } = await createIndex({
      page: '5',
      search: 'foo',
    });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fetchData = vi.spyOn(component, 'fetchData');

    expect(component.pageIndex).toBe(4);

    fetchData.mockClear();
    queryParams$.next({ page: '5', search: 'bar', per_page: '10' });

    expect(component.filterForm.get('page')?.value).toBe(1);
    expect(component.pageIndex).toBe(0);
    expect(fetchData).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: 1 },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('still fetches after filter reset even if navigate does not re-emit', async () => {
    const { component, queryParams$, router } = await createIndex({
      page: '5',
      search: 'foo',
    });
    // Simulate navigate no-op (same URL / failure): no second queryParams emit.
    vi.spyOn(router, 'navigate').mockResolvedValue(false);
    const fetchData = vi.spyOn(component, 'fetchData');
    fetchData.mockClear();

    queryParams$.next({ page: '5', search: 'bar', per_page: '10' });

    expect(component.filterForm.get('page')?.value).toBe(1);
    expect(component.pageIndex).toBe(0);
    expect(fetchData).toHaveBeenCalledOnce();
  });

  it('treats null, undefined and empty string as equivalent filter values', async () => {
    const { component } = await createIndex();
    const valuesEquivalent = valuesEquivalentOf(component);

    expect(valuesEquivalent(null, undefined)).toBe(true);
    expect(valuesEquivalent('', undefined)).toBe(true);
    expect(valuesEquivalent('', null)).toBe(true);
    expect(valuesEquivalent('x', undefined)).toBe(false);
  });

  it('resets to page 1 when per_page changes', async () => {
    const { component, router } = await createIndex({ page: '3' });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.filterForm.patchValue({ page: 3, per_page: 20 });
    await flushDebounce();

    expect(component.filterForm.get('page')?.value).toBe(1);
    expect(component.pageIndex).toBe(0);
    const navigatedParams = navigate.mock.calls.at(-1)?.[1]?.queryParams as Record<
      string,
      unknown
    >;
    expect(navigatedParams['page']).toBe(1);
    expect(navigatedParams['per_page']).toBe(20);
  });

  it('exposes typed fb/utils from the base for subclasses that only call super()', async () => {
    @Component({
      selector: 'inherits-fb',
      standalone: true,
      template: '',
    })
    class InheritsFbComponent extends IndexTemplateComponent {
      constructor(
        router: Router,
        fb: FormBuilder,
        activatedRoute: ActivatedRoute,
        utils: UtilsService,
      ) {
        super(router, fb, activatedRoute, utils);
      }

      usesFb() {
        return this.fb.group({ ok: [true] });
      }
    }

    await TestBed.configureTestingModule({
      imports: [InheritsFbComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(InheritsFbComponent);
    const component = fixture.componentInstance;

    expect(component.filterForm.contains('page')).toBe(true);
    expect(component.usesFb().getRawValue()).toEqual({ ok: true });
  });

  it('allows protected constructor params that match the base fields', async () => {
    @Component({
      selector: 'protected-ctor-index',
      standalone: true,
      template: '',
    })
    class ProtectedCtorIndexComponent extends IndexTemplateComponent {
      constructor(
        protected override router: Router,
        protected override fb: FormBuilder,
        protected override activatedRoute: ActivatedRoute,
        protected override utils: UtilsService,
      ) {
        super(router, fb, activatedRoute, utils);
      }

      override fetchData(): void {
        void this.router.navigate([], { queryParams: this.filterForm.value });
      }
    }

    await TestBed.configureTestingModule({
      imports: [ProtectedCtorIndexComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProtectedCtorIndexComponent);
    expect(fixture.componentInstance.filterForm.contains('page')).toBe(true);
    fixture.componentInstance.fetchData();
  });

  it('encodes sort direction inside order_by and never adds order_by_direction', async () => {
    await TestBed.configureTestingModule({
      imports: [IndexTemplateComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(IndexTemplateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.sortChange({ active: 'created_at', direction: 'desc' });

    expect(component.sorting).toEqual({ order_by: 'created_at:desc' });
    expect(component.filterForm.get('order_by')?.value).toBe('created_at:desc');
    expect(component.filterForm.contains('order_by_direction')).toBe(false);

    component.sortChange({ active: 'created_at', direction: '' });

    expect(component.sorting).toEqual({ order_by: null });
    expect(component.filterForm.get('order_by')?.value).toBeNull();
    expect(component.filterForm.contains('order_by_direction')).toBe(false);
  });

  it('treats array query param values as equal when comparing filters', async () => {
    await TestBed.configureTestingModule({
      imports: [IndexTemplateComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(IndexTemplateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const left = { status: ['open', 'won'] };
    const right = { status: ['open', 'won'] };
    const different = { status: ['open'] };

    expect(
      (component as unknown as { valuesEqual: (a: object, b: object) => boolean }).valuesEqual(
        left,
        right,
      ),
    ).toBe(true);
    expect(
      (component as unknown as { valuesEqual: (a: object, b: object) => boolean }).valuesEqual(
        left,
        different,
      ),
    ).toBe(false);
  });
});

describe('UtilsService', () => {
  const service = new UtilsService();

  it('calculates day differences across month boundaries', () => {
    expect(
      service.diffDays(new Date(2026, 0, 31), new Date(2026, 1, 2)),
    ).toBe(2);
  });

  it('formats dates with padded month and day values', () => {
    const date = new Date(2026, 6, 3);

    expect(service.dateToString(date)).toBe('03-07-2026');
    expect(service.dateToStringYYYYMMDD(date)).toBe('2026-07-03');
  });
});
