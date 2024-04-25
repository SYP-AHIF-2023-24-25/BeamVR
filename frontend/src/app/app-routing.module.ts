import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './login/login.component';
import {ScoresComponent} from "./scores/scores.component";
import {HighestLatestScores} from "./highest-latest-scores/highest-latest-scores.component";
import {AdminComponent} from "./admin/admin.component";

const routes: Routes = [
    {path: "", redirectTo: 'login', pathMatch: 'full'},
    {path: "login", component: LoginComponent},
    {path: "scores", component: ScoresComponent},
    {path: "highest-latest-scores", component: HighestLatestScores},
    {path: 'admin', component: AdminComponent},
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
