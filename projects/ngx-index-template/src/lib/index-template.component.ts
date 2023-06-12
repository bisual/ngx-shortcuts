export class IndexTemplateComponent<T> {

  displayedColumns: string[] = []
  dataSource: MatTableDataSource<Coupon> = new MatTableDataSource<Coupon>()
  length: number = 0
  pageSize: number = 5
  pageSizeOptions: number[] = [5, 10, 20, 50]
  pageIndex: number = 0

  constructor() {

  }

}
