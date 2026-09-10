import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { IndexTemplateComponent } from './index-template.component';
import { UtilsService } from './services/utils.service';

describe('IndexTemplateComponent', () => {
  it('creates the default filter form', async () => {
    await TestBed.configureTestingModule({
      imports: [IndexTemplateComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(IndexTemplateComponent);
    const component = fixture.componentInstance;
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

  it('allows private constructor params + override fetchData (legacy apps)', async () => {
    @Component({
      selector: 'customers-like',
      standalone: true,
      template: '',
    })
    class CustomersLikeComponent extends IndexTemplateComponent {
      constructor(
        private router: Router,
        private fb: FormBuilder,
        private activatedRoute: ActivatedRoute,
        private utils: UtilsService,
      ) {
        super(router, fb, activatedRoute, utils);
      }

      override fetchData(): void {
        void this.router.navigate([], { queryParams: this.filterForm.value });
      }

      usesFb() {
        return this.fb.group({ ok: [true] });
      }
    }

    await TestBed.configureTestingModule({
      imports: [CustomersLikeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(CustomersLikeComponent);
    const component = fixture.componentInstance;

    expect(component.filterForm.contains('page')).toBe(true);
    expect(component.usesFb().getRawValue()).toEqual({ ok: true });
    component.fetchData();
  });

  it('allows protected constructor params without override keyword', async () => {
    @Component({
      selector: 'protected-ctor-index',
      standalone: true,
      template: '',
    })
    class ProtectedCtorIndexComponent extends IndexTemplateComponent {
      constructor(
        protected router: Router,
        protected fb: FormBuilder,
        protected activatedRoute: ActivatedRoute,
        protected utils: UtilsService,
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
