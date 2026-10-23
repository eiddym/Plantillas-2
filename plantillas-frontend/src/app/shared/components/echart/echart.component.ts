import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

@Component({
  selector: 'app-echart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #chartContainer
      class="echart-container"
      [style.height]="height"
      [style.width]="width"
    ></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .echart-container {
      width: 100%;
      min-height: 200px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EchartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartContainer', { static: false }) containerRef?: ElementRef<HTMLDivElement>;

  @Input() options: echarts.EChartsOption | null = null;
  @Input() height: string = '320px';
  @Input() width: string = '100%';
  @Input() loading: boolean = false;

  private chartInstance: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.chartInstance && this.options) {
      this.chartInstance.setOption(this.options, true);
    }
    if (changes['loading'] && this.chartInstance) {
      if (this.loading) {
        this.chartInstance.showLoading('default', {
          text: 'Cargando métricas...',
          color: '#3b82f6',
          textColor: '#64748b',
          maskColor: 'rgba(255, 255, 255, 0.8)'
        });
      } else {
        this.chartInstance.hideLoading();
      }
    }
  }

  private initChart(): void {
    if (!this.containerRef?.nativeElement) return;

    this.chartInstance = echarts.init(this.containerRef.nativeElement, undefined, {
      renderer: 'canvas'
    });

    if (this.options) {
      this.chartInstance.setOption(this.options);
    }

    // Adaptabilidad automática con ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.chartInstance?.resize();
      });
      this.resizeObserver.observe(this.containerRef.nativeElement);
    } else {
      window.addEventListener('resize', this.onWindowResize);
    }
  }

  private onWindowResize = (): void => {
    this.chartInstance?.resize();
  };

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }
}
