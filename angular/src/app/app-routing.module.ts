import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { AdminComponent } from './components/admin/admin.component';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AllScoresComponent } from './components/all-scores/all-scores.component';

const routes: Routes = [
  { path: "", component: MainComponent},
  { path: "admin", component: AdminComponent},
  { path: "login", component: LoginComponent},
  { path: "all-scores", component: AllScoresComponent},
  { path: "**", component: NotFoundComponent} //this is the 404 page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
