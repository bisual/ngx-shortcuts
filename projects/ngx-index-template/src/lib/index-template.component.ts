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
  sorting:any = {order_by: null};
  debounceTimeInMs:number = 200

  filterForm:UntypedFormGroup;
  formPersistence:any;
  filterFormExtraParams:any = {};

  serializer:{[key:string]:() => any} = {};
  deserializer:{[key:string]:((data:string) => any)} = {};

  constructor(
    protected router: Router,
    protected fb:UntypedFormBuilder,
    protected activatedRoute:ActivatedRoute,
    protected utils:UtilsService,
  ) {
    super();
    this.filterForm = this.fb.group({
      search: [this.activatedRoute.snapshot.queryParamMap.get('search')!=null ? this.activatedRoute.snapshot.queryParamMap.get('search') : '', Validators.compose([Validators.minLength(3)])],
      per_page: [this.activatedRoute.snapshot.queryParamMap.get('per_page')!=null ? +(this.activatedRoute.snapshot.queryParamMap.get('per_page') as any) : this.pageSize, Validators.required],
      page: [this.activatedRoute.snapshot.queryParamMap.get('page')!=null ? +(this.activatedRoute.snapshot.queryParamMap.get('page') as any) : this.pageIndex, Validators.required],
      order_by: [this.activatedRoute.snapshot.queryParamMap.get('order_by')!=null ? this.activatedRoute.snapshot.queryParamMap.get('order_by') : this.sorting.order_by],
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

          for(let key of Object.keys(this.serializer)) {
            data[key] = this.serializer[key]();
          }

          // navigate to same route with new query params
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: data,
            queryParamsHandling: 'merge', // remove to replace all query params by provided
          });
        }
      }
    );
  }

  private listenQueryParameters() {
    this.activatedRoute.queryParams.subscribe(
      params => {
      const previousParams = this.formPersistence || {};
      const currentParams = { ...params };

      // Determine the fields that have changed
      const fieldsChanged = Object.keys(currentParams).filter(key => previousParams[key] !== currentParams[key]);

      // Check if there is just one field changed to avoid problems on init search.
      // Check if any of the changed fields are in the noFetchFields array.
      const noFetchTriggered = fieldsChanged.length === 0 && fieldsChanged.some(field => this.noFetchFields.includes(field));

      if (JSON.stringify(currentParams) !== JSON.stringify(this.filterForm.value)) {
        let params_temp = this.utils.cloneObj(currentParams);
        Object.keys(params_temp).forEach(param_key => {
          if(param_key in this.deserializer) {
            params_temp[param_key] = this.deserializer[param_key](params_temp[param_key]);
          }
          else if (params_temp[param_key]!=null && params_temp[param_key]!="" && !isNaN(+params_temp[param_key])) {
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
      order_by: event.active
    }
    // add sorting params to form
    this.filterForm.patchValue({
      order_by: event.active
    });
  }

  setMetadata(length:number, currentPage:number, pageSize: number) {
    this.length = length
    this.pageIndex = currentPage
    this.pageSize = pageSize
  }
}
