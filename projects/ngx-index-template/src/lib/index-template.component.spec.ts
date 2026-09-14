import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { IndexTemplateComponent } from './index-template.component';
import { UtilsService } from './services/utils.service';

describe('IndexTemplateComponent', () => {
  it('creates the default filter form without order_by_direction', async () => {
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
