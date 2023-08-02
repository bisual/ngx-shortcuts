import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'index-template-component',
  template: `
  <!-- Content projection using ng-content -->
  <ng-content></ng-content>
`,
})

export class IndexTemplateComponent implements OnInit {
  displayedColumns: string[] = [];
  // dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  length: number = 0;
  pageSize: number = 5;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  pageIndex: number = 0;

  constructor() {}

  ngOnInit(): void {
    // Add any initialization logic here if needed
  }
}
