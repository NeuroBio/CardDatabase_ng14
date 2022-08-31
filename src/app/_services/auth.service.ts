import { Injectable } from '@angular/core';
import * as allAuth from 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Location } from '@angular/common';  

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // load: () => Promise<void>;
  isLoggedIn = false;
  // currentUser: () => Observable<User>;
  // currentUserSnapshot: () => User;
  // googleAuth: () => Promise<void>;
  // logout: () => Promise<void>;

  constructor(
    private afs: AngularFirestore,
    private auth: AngularFireAuth,
  ) { }

  
    // const currentUser = new BehaviorSubject<User>(undefined);
    // const userRepo = new UserRepo(afs, verificationserv);

    load = async () => {
      return this.auth.authState.pipe(take(1)).toPromise().then((auth) => {
        if (auth) {
          this.isLoggedIn = true;
        }
      });
    };

    googleAuth = async () => {
      return this._authLogin(new allAuth.GoogleAuthProvider());
    };

    logout = async () => {
      return this.auth.signOut().then(() => {
        this.isLoggedIn = false;
      });
    };

    private async _authLogin(provider: any): Promise<void> {
      return this.auth.signInWithPopup(provider)
        .then((result) => {
          if (result.user) {
            this.isLoggedIn = true;
          }
          // return _getCurrentUser(result.user);
        })
        .catch((err) => {
          window.alert(err);
        });
    };

    // async function _getCurrentUser(user: FirebaseUser): Promise<void> {
    //   return userRepo.obtainUser(user).then(res => {
    //     if (res.isOk()) {
    //       currentUser.next(res.value());
    //       isLoggedIn = true;
    //       const redirect = location.pathname === '/' ? '/home' : location.pathname;
    //       router.navigate([redirect]);
    //     } else {
    //         console.log(res.error())
    //     }
    //   });
    // };

}
