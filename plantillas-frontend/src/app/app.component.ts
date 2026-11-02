import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'plantillas-frontend-v17';
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.iniciarMonitoreoActividad();
    }
  }
}
