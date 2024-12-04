import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
// import { MatTableDataSource } from '@angular/material/table';
// import { PageEvent } from '@angular/material/paginator';

import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { UtilsService } from './services/utils.service';
import { IndexTemplateAbstractClass } from './abstract/index-template-abstract';

@Component({
  selector: 'index-template-component',
  template: `<ng-content></ng-content>`,
})

export class IndexTemplateComponent extends IndexTemplateAbstractClass implements OnInit {
  @Input() noFetchFields: string[] = [];
  displayedColumns: string[] = [];
  // dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  length: number = 0;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  pageIndex: number = 1;
  sorting:any = {order_by: null, order_by_direction: 'asc'};
  debounceTimeInMs:number = 200

  filterForm:UntypedFormGroup;
  formPersistence:any;
  filterFormExtraParams:any = {};

  private _router: Router;
  private _fb: UntypedFormBuilder;
  private _activatedRoute: ActivatedRoute;
  private _utils: UtilsService;

  constructor(
    router: Router,
    fb:UntypedFormBuilder,
    activatedRoute:ActivatedRoute,
    utils:UtilsService,
  ) {
    super();

    this._router = router;
    this._fb = fb;
    this._activatedRoute = activatedRoute;
    this._utils = utils;

    this.filterForm = this._fb.group({
      search: [this._activatedRoute.snapshot.queryParamMap.get('search')!=null ? this._activatedRoute.snapshot.queryParamMap.get('search') : '', Validators.compose([Validators.minLength(3)])],
      per_page: [this._activatedRoute.snapshot.queryParamMap.get('per_page')!=null ? +(this._activatedRoute.snapshot.queryParamMap.get('per_page') as any) : this.pageSize, Validators.required],
      page: [this._activatedRoute.snapshot.queryParamMap.get('page')!=null ? +(this._activatedRoute.snapshot.queryParamMap.get('page') as any) : this.pageIndex, Validators.required],
      order_by: [this._activatedRoute.snapshot.queryParamMap.get('order_by')!=null ? this._activatedRoute.snapshot.queryParamMap.get('order_by') : this.sorting.order_by],
      order_by_direction: [this._activatedRoute.snapshot.queryParamMap.get('order_by_direction')!=null ? this._activatedRoute.snapshot.queryParamMap.get('order_by_direction') : this.sorting.order_by_direction],
      ...this.filterFormExtraParams
    });
   }

  ngOnInit(): void {
    this.initFilterFormListener();
    this.listenQueryParameters();
  }

  fetchData(): void {}

  private initFilterFormListener() {
    this.filterForm.valueChanges.pipe(debounceTime(this.debounceTimeInMs)).subscribe(
      data => {
        data.per_page = +data.per_page;
        if(this.formPersistence==null || JSON.stringify(this.formPersistence)!=JSON.stringify(data)) {
          if(this.formPersistence.per_page!=data.per_page && data.page==this.formPersistence.page && this.formPersistence.page != null) {
            data.page = 1;
          }
          // navigate to same route with new query params
          this._router.navigate([], {
            relativeTo: this._activatedRoute,
            queryParams: data,
            queryParamsHandling: 'merge', // remove to replace all query params by provided
          });
        }
      }
    );
  }

  private listenQueryParameters() {
    this._activatedRoute.queryParams.subscribe(
      params => {
      const previousParams = this.formPersistence || {};
      const currentParams = { ...params };

      // Determine the fields that have changed
      const fieldsChanged = Object.keys(currentParams).filter(key => previousParams[key] !== currentParams[key]);

      // Check if there is just one field changed to avoid problems on init search.
      // Check if any of the changed fields are in the noFetchFields array.
      const noFetchTriggered = fieldsChanged.length === 0 && fieldsChanged.some(field => this.noFetchFields.includes(field));

      if (JSON.stringify(currentParams) !== JSON.stringify(this.filterForm.value)) {
        let params_temp = this._utils.cloneObj(currentParams);
        Object.keys(params_temp).forEach(param_key => {
          if (params_temp[param_key]!=null && params_temp[param_key]!="" && !isNaN(+params_temp[param_key])) {
            params_temp[param_key] = +params_temp[param_key];
          }
        });

        // if a in this.filterForm is different than the previous one, set page to 1
        if(this.formPersistence!=null) {
          Object.keys(this.filterForm.controls).forEach(form_key => {
            if(form_key!='page' && this.formPersistence[form_key]!=params_temp[form_key]) params_temp['page'] = 1;
          });
        }

        this.filterForm.patchValue(params_temp, { emitEvent: false });
      }

      this.formPersistence = currentParams;
      if (!noFetchTriggered) {
        this.fetchData();
      }
    });
  }

  changePage(event:any) {
    this.filterForm.patchValue({
      page: event.pageIndex + 1,
      per_page: event.pageSize
    });
  }

  sortChange(event:any) {
    this.sorting = {
      order_by: event.active,
      order_by_direction: event.direction
    }
    // add sorting params to form
    this.filterForm.patchValue({
      order_by: event.active,
      order_by_direction: event.direction
    });
  }

  setMetadata(length:number, currentPage:number, pageSize: number) {
    this.length = length
    this.pageIndex = currentPage
    this.pageSize = pageSize
  }
}
