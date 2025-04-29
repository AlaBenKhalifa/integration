import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'split'
})
export class SplitPipe implements PipeTransform {
  transform(value: string, delimiter: string): string[] {
    if (!value || typeof value !== 'string') {
      return [];
    }
    return value.split(delimiter);
  }
}
