import { Observable } from 'rxjs';

export abstract class IndexTemplateAbstractClass {
  abstract fetchData() : void | Observable<any>;
}
