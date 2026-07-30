import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
    expect(fetchData).toHaveBeenCalledOnce();
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
