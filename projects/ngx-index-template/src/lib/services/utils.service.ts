import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }

  public cloneObj(src:any) {
    let target:any = {};
    for (let key in src) {
      if(src[key]==null) {
        target[key] = null;
      }
      else if(Array.isArray(src[key])) {
        target[key] = [];
        for(let k2 in src[key]) {
          target[key][k2] = this.cloneObj(src[key][k2]);
        }
      }
      else if(src[key] instanceof Date) {
        target[key] = new Date(src[key]);
      }
      else if(typeof src[key] === 'object') {
        target[key] = this.cloneObj(src[key]);
      }
      else {
        target[key] = src[key];
      }
    }
    return target;
  }

  public diffDays(d1:Date, d2:Date) {
    return d2.getDate() - d1.getDate();
  }

  sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getChartsColorScheme() {
    return {
      domain: ['#0C83E1', '#6BC434', "#CE2525", "#E3B163", "#888888", "#E8F5FF"]
    };
  }

  getGreenRedColorScheme() {
    return {
      domain: ["#6BC434", "#CE2525"]
    };
  }

  public dateToString(d:Date):string {
    return d.getDate() + "-" + (d.getMonth()+1) + "-" + d.getFullYear();
  }

  public dateToStringYYYYMMDD(d:Date):string {
    return d.getFullYear() + '-' + (d.getMonth()+1) + "-" + d.getDate();
  }

  public stringToDate(str:string):Date {
    const str_splitted = str.split("-");
    return new Date(+str_splitted[2], +str_splitted[1] - 1, +str_splitted[0]);
  }

  public generateColor(value:number, minValue:number, maxValue:number, maxColor:string) {
    // Normalize the value to a range between 0 and 1
    const normalizedValue = (value - minValue) / (maxValue - minValue);

    // Calculate the alpha (transparency) value based on the normalized value (0 to 1)
    const alpha = Math.round(255 * normalizedValue).toString(16).padStart(2, '0');

    // Calculate the alpha value for the minimum color (using 25 as the minimum alpha)
    const minAlpha = Math.round(25 + normalizedValue * (255 - 25)).toString(16).padStart(2, '0');

    // Append the alpha value to the maxColor or minAlpha to get the new color
    const newColor = normalizedValue === 1 ? maxColor + alpha : maxColor + minAlpha;

    return newColor;
  }
}
