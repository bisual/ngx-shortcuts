# @bisual/ngx-index-template

Reactive index-page primitives for Angular 22. The component keeps filters,
pagination and sorting synchronized with the router query parameters.

## Requirements

- Angular 22
- RxJS 7.8
- Node.js 22.22.3+, 24.15.0+ or 26+

## Usage

`IndexTemplateComponent` is standalone and can be imported directly. The
`NgxIndexTemplateModule` export remains available for NgModule applications.

```ts
import { Component } from '@angular/core';
import { IndexTemplateComponent } from '@bisual/ngx-index-template';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [IndexTemplateComponent],
  template: `...`,
})
export class ProductsComponent extends IndexTemplateComponent {
  override fetchData(): void {
    // Refresh imperative or Observable-based data here.
  }
}
```

`noFetchFields` is a classic `@Input()` (string array). Bind it from the
template when a query-param change should update the URL without calling
`fetchData()`:

```html
<index-template-component [noFetchFields]="['panel']">
  ...
</index-template-component>
```

### Sorting and laravel-shortcuts

Sort direction must live inside `order_by` (`field:asc` / `field:desc`).
`sortChange()` writes that format. Do **not** send a separate
`order_by_direction` query param — laravel-shortcuts would treat it as a
column filter and can break the request.

```ts
// Prefer this in fetchData / API params:
order_by: 'created_at:desc'

// Or via the Material sort handler:
this.sortChange({ active: 'created_at', direction: 'desc' });
// → filterForm.order_by === 'created_at:desc'
```

### Extending the component

Pass `(router, fb, activatedRoute, utils)` into `super(...)`. Prefer bare
constructor params or `inject()` rather than `private router` /
`private fb` parameter properties — those conflict with the protected
fields on the base class. `protected override …` is fine when you need
to re-declare them.

## Angular 22 `httpResource`

For GET requests, prefer `httpResource` in the concrete page. The library does
not create an HTTP resource itself because only the consuming application knows
the endpoint and response type. `queryParameters` is exposed as a signal so the
resource reloads and cancels stale requests automatically.

```ts
import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { IndexTemplateComponent } from '@bisual/ngx-index-template';

interface ProductPage {
  readonly data: readonly Product[];
  readonly total: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  template: `...`,
})
export class ProductsComponent extends IndexTemplateComponent {
  readonly products = httpResource<ProductPage>(
    () => ({
      url: '/api/products',
      params: this.queryParameters(),
    }),
    { defaultValue: { data: [], total: 0 } },
  );
}
```

Configure `HttpClient` in the consuming application when HTTP features such as
interceptors or XSRF options are needed:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()],
});
```

Use `HttpClient` directly for mutations such as POST, PUT, PATCH or DELETE.

## Development

```bash
npm run build
npm test
```

The production package is generated in `dist/ngx-index-template`.
