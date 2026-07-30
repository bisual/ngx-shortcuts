import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  cloneObj<T>(source: T): T {
    return structuredClone(source);
  }

  diffDays(firstDate: Date, secondDate: Date): number {
    const millisecondsPerDay = 86_400_000;
    return Math.trunc(
      (secondDate.getTime() - firstDate.getTime()) / millisecondsPerDay,
    );
  }

  sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  getChartsColorScheme(): { readonly domain: readonly string[] } {
    return {
      domain: ['#0C83E1', '#6BC434', '#CE2525', '#E3B163', '#888888', '#E8F5FF'],
    };
  }

  getGreenRedColorScheme(): { readonly domain: readonly string[] } {
    return {
      domain: ['#6BC434', '#CE2525'],
    };
  }

  dateToString(date: Date): string {
    return `${this.pad(date.getDate())}-${this.pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  }

  dateToStringYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  stringToDate(value: string): Date {
    const [day, month, year] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  generateColor(
    value: number,
    minValue: number,
    maxValue: number,
    color: string,
  ): string {
    const range = maxValue - minValue;
    const normalizedValue =
      range === 0 ? 1 : Math.min(1, Math.max(0, (value - minValue) / range));
    const alpha = Math.round(25 + normalizedValue * 230)
      .toString(16)
      .padStart(2, '0');

    return `${color}${alpha}`;
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
