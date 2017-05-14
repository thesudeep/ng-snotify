import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2,
  ViewChild
} from '@angular/core';
import {SnotifyService} from '../snotify.service';
import {SnotifyToast} from './snotify-toast.model';
import {SnotifyAction, SnotifyConfig, SnotifyType} from '../snotify-config';

@Component({
  selector: 'app-snotify-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() id: number;
  @ViewChild('wrapper') wrapper: ElementRef;
  @ViewChild('progress') progressBar: ElementRef;
  config: SnotifyConfig;

  frameRate = 10;

  progress: number;
  toast: SnotifyToast;
  interval: any;

  types = {
    success: false,
    warning: false,
    error: false,
    info: false,
    bare: false,
    async: true
  };

  constructor(private service: SnotifyService, private render: Renderer2, private zone: NgZone) { }

  ngOnInit() {
    this.config = this.service.getConfig(this.id);
    this.toast = this.service.get(this.id);
    this.setType(this.config.type);
    this.service.typeChanged.subscribe(
      (data) => {
        if (this.id === data.id) {
          this.config.type = data.type;
          this.setType(this.config.type);
          if (data.closeOnClick) {
            this.config.closeOnClick = data.closeOnClick;
          }
        }
      }
    );

    if (this.config.timeout > 0) {
      this.startTimeout(0);
    } else {
      this.config.showProgressBar = false;
    }
  }

  setType(type: SnotifyType) {
    this.resetTypes();

    switch (type) {
      case SnotifyType.SUCCESS:
        this.types.success = true;
        break;
      case SnotifyType.ERROR:
        this.types.error = true;
        break;
      case SnotifyType.WARNING:
        this.types.warning = true;
        break;
      case SnotifyType.INFO:
        this.types.info = true;
        break;
      case SnotifyType.ASYNC:
        this.types.info = true;
        this.types.async = true;
        break;
      default:
        this.types.bare = true;
        break;
    }
  }

  resetTypes() {
    this.types.info =
    this.types.error =
    this.types.warning =
    this.types.bare =
    this.types.success =
    this.types.async =
      false;
  }

  ngAfterViewInit() {
    setTimeout(() => this.onShow(), 50);
  }

  onClick() {
    this.lifecycle(SnotifyAction.onClick);
    if (this.config.closeOnClick) {
      this.service.remove(this.id, this.onRemove.bind(this));
    }
  }

  onRemove() {
    this.lifecycle(SnotifyAction.beforeDestroy);
    this.render.addClass(this.wrapper.nativeElement, 'snotify-remove');
  }

  onShow() {
    this.render.addClass(this.wrapper.nativeElement, 'snotify-show');
    this.lifecycle(SnotifyAction.onInit);
  }

  onEnter() {
    this.lifecycle(SnotifyAction.onHoverEnter);
    if (this.config.pauseOnHover) {
      clearInterval(this.interval);
    }
  }

  onLeave() {
    if (this.config.pauseOnHover) {
      this.startTimeout(this.progress);
    }
    this.lifecycle(SnotifyAction.onHoverLeave);
  }

  startTimeout(currentProgress: number) {
    this.progress = currentProgress;
    const step = this.frameRate / this.config.timeout * 100;
    this.zone.runOutsideAngular(() => {
      this.interval = setInterval(() => {
        this.progress += step;
        if (this.progress >= 100) {
          this.zone.run(() => {
            clearInterval(this.interval);
            this.service.remove(this.id, this.onRemove.bind(this));
          });
        }
        if (this.config.showProgressBar) {
          this.drawProgressBar(this.progress);
        }
      }, this.frameRate);
    });
  }

  drawProgressBar(width: number) {
    this.render.setStyle(this.progressBar.nativeElement, 'width', width + '%');
  }

  private lifecycle(action: SnotifyAction) {
    return this.service.lifecycle.next({
      action,
      toast: this.toast
    });
  }

  ngOnDestroy(): void {
    this.lifecycle(SnotifyAction.afterDestroy);
  }

}
