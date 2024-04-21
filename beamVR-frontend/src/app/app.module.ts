import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {HttpClientModule} from '@angular/common/http';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {LoginComponent} from './login/login.component';
import {ScoresComponent} from './scores/scores.component';
import {FormsModule} from "@angular/forms";
import {NgOptimizedImage} from "@angular/common";
import {HighestLatestScores} from "./highest-latest-scores/highest-latest-scores.component";
import {AdminComponent} from "./admin/admin.component";

@NgModule({
    declarations: [
        AppComponent,
        LoginComponent,
        ScoresComponent,
        HighestLatestScores,
        AdminComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,
        FormsModule,
        NgOptimizedImage,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
