import { TestBed } from '@angular/core/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularfireAuthMock } from 'src/app/test/mock-services/angularfire-auth.mock';
import { AngularfireStoreMock } from 'src/app/test/mock-services/angularfire-store.mock';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      providers: [
        { provide: AngularFirestore, useClass: AngularfireStoreMock },
        { provide: AngularFireAuth, useClass: AngularfireAuthMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
