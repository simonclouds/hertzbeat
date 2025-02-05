import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { EChartsOption } from 'echarts';
import { NzMessageService } from 'ng-zorro-antd/message';
import { fromEvent } from 'rxjs';

import { MonitorService } from '../../service/monitor.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  constructor(
    private msg: NzMessageService,
    private monitorSvc: MonitorService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  interval$!: number;
  appsCountLoading: boolean = true;
  appsCountTableData: any[] = [];
  appsCountEChartOption!: EChartsOption;
  appsCountTheme!: EChartsOption;
  echartsInstance!: any;
  pageResize$!: any;

  ngOnInit(): void {
    this.appsCountLoading = true;
    this.appsCountTheme = {
      title: {
        text: '监控总览',
        subtext: '监控类型纳管数量分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c}个监控 占比({d}%)'
      },
      legend: {
        show: false,
        itemWidth: 80,
        itemHeight: 20,
        right: 0,
        orient: 'vertical'
      },
      calculable: true,
      series: [
        {
          name: '总量',
          type: 'pie',
          selectedMode: 'single',
          color: '#722ED1',
          radius: [0, '30%'],
          label: {
            position: 'center',
            fontSize: 15,
            color: '#ffffff',
            fontStyle: 'oblique',
            formatter: '{a}:{c}'
          },
          labelLine: {
            show: false
          },
          data: [{ value: 0, name: '监控总量' }]
        },
        {
          name: '纳管数量分布',
          type: 'pie',
          radius: ['45%', '65%'],
          labelLine: {
            length: 30
          },
          label: {
            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
            backgroundColor: '#F6F8FC',
            borderColor: '#8C8D8E',
            borderWidth: 1,
            borderRadius: 4,
            rich: {
              a: {
                color: '#6E7079',
                lineHeight: 22,
                align: 'center'
              },
              hr: {
                borderColor: '#8C8D8E',
                width: '100%',
                borderWidth: 1,
                height: 0
              },
              b: {
                color: '#4C5058',
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 33
              },
              per: {
                color: '#fff',
                backgroundColor: '#4C5058',
                padding: [3, 4],
                borderRadius: 4
              }
            }
          }
        }
      ]
    };
    this.refresh();
    this.appsCountLoading = false;
    // https://stackoverflow.com/questions/43908009/why-is-setinterval-in-an-angular-service-only-firing-one-time
    this.interval$ = setInterval(this.refresh.bind(this), 30000);
    this.pageResize$ = fromEvent(window, 'resize').subscribe(event => {
      this.resizeChart();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.interval$);
    if (this.pageResize$) {
      this.pageResize$.unsubscribe();
    }
  }

  refresh(): void {
    let dashboard$ = this.monitorSvc.getAppsMonitorSummary().subscribe(
      message => {
        dashboard$.unsubscribe();
        if (message.code === 0 && message.data.apps != undefined) {
          // {app:'linux',size: 12}
          let apps: any[] = message.data.apps;
          this.appsCountTableData = [];
          let total = 0;
          apps.forEach(app => {
            let appName = this.i18nSvc.fanyi(`monitor.app.${app.app}`);
            this.appsCountTableData.push({
              // 自定义属性
              app: app.app,
              // 默认属性
              name: appName,
              value: app.size
            });
            total = total + (app.size ? app.size : 0);
          });
          // @ts-ignore
          this.appsCountTheme.series[0].data = [{ value: total, name: '监控总量' }];
          // @ts-ignore
          this.appsCountTheme.series[1].data = this.appsCountTableData;
          this.appsCountEChartOption = this.appsCountTheme;
          this.cdr.detectChanges();
        } else {
          this.appsCountEChartOption = this.appsCountTheme;
          this.cdr.detectChanges();
        }
      },
      error => {
        console.error(error);
        dashboard$.unsubscribe();
      }
    );
  }

  onChartClick(click: any) {
    if (click != undefined) {
      let app = click.data?.app;
      if (app != undefined) {
        this.router.navigate(['/monitors'], { queryParams: { app: app } });
      }
    }
  }

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }
  resizeChart() {
    if (this.echartsInstance) {
      this.echartsInstance.resize();
    }
  }
}
