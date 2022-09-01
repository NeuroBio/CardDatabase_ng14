import {  APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';

// declarations
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { ToolbarComponent } from './toolbar/toolbar.component';


// Firebase services
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// factories
import { AuthService } from './_services/auth.service';
export function AuthFactory(provider: AuthService): () => void {
  return () => provider.load();
}

import { CollectionService } from './_services/collection.service';
export function CollectionFactory(provider: CollectionService): () => Promise<boolean> {
  return () => provider.load();
}



@NgModule({
  declarations: [
    AppComponent,
    ToolbarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireDatabaseModule,
    
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  providers: [
    CollectionService,
    { provide: APP_INITIALIZER, useFactory: CollectionFactory,
      deps: [CollectionService], multi: true },

    AuthService,
    { provide: APP_INITIALIZER, useFactory: AuthFactory,
      deps: [AuthService], multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
