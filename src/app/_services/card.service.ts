import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';
import { CardInstance, CardStorage } from '../_objects/card-instance';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor(
    private af: AngularFirestore,
    private as: AngularFireStorage
  ) { }

  uploadCard(newCard: CardInstance, images: Blob[]): Observable<boolean> {
    // get card storage
    return this.af.doc<any>(`pokemon-cards/${newCard.expansionName}-${newCard.printNumber}`)
    .valueChanges().pipe(
      take(1),
      switchMap(cardBox => {

        // make cardstorage if none exists
        if (!cardBox) {
          cardBox = new CardStorage(newCard.expansionName, newCard.printNumber);
        } else {
          cardBox.cards = JSON.parse(cardBox.cards);
          delete cardBox.deleted;
        }

        // upload image if there are any to upload
        return forkJoin(images.map((image, i) => {
          if (image) {
            const path = `card-images/${newCard.uid}-${i === 0 ? 'front' : 'back'}`;
            return this.as.upload(path, image)
              .snapshotChanges().pipe(finalize(() => {})).toPromise()
              .then(() => {
                return this.as.ref(path).getDownloadURL().toPromise();
            }).then(url => {
              newCard[i === 0 ? 'front' : 'back'] = url;
            });
          }
          return of ().toPromise();
        })).pipe(switchMap(() => {
          cardBox.cards[newCard.uid] = newCard;
          cardBox.cards = JSON.stringify(cardBox.cards);
          cardBox.lastUpdated = +Date.now();
          return this.af.collection<any>(`pokemon-cards`)
            .doc(`${newCard.expansionName}-${newCard.printNumber}`)
            .set(Object.assign({}, cardBox));
        }) ).pipe(map(() => true));
      }),
      catchError(err => {
        console.error(err);
        return of(false);
      })
    );
  }

  massUploadCard(newCards: CardInstance[]) {
    // get card storage
    return this.af.doc<any>(`pokemon-cards/${newCards[0].expansionName}-${newCards[0].printNumber}`)
    .valueChanges().pipe(
      take(1),
      switchMap(cardBox => {
        // make cardstorage if none exists
        if (!cardBox) {
          cardBox = new CardStorage(newCards[0].expansionName, newCards[0].printNumber);
        } else {
          cardBox.cards = JSON.parse(cardBox.cards);
          delete cardBox.deleted;
        }

        // add all cards (none will have images)
        newCards.forEach(card => cardBox.cards[card.uid] = card);
        cardBox.cards = JSON.stringify(cardBox.cards);
        cardBox.lastUpdated = +Date.now();
        return this.af.collection<any>(`pokemon-cards`)
          .doc(`${newCards[0].expansionName}-${newCards[0].printNumber}`)
          .set(Object.assign({}, cardBox));
      }) ).pipe(
        map(() => true),
        catchError(err => {
          console.error(err);
          return of(false);
        })
    );
  }

  deleteCard(expansion: string, print: number, uid: string): Observable<boolean> {
    return this.af.doc<any>(`pokemon-cards/${expansion}-${print}`)
    .valueChanges().pipe(
      take(1),
      switchMap(cardBox => {
        cardBox.cards = JSON.parse(cardBox.cards);
        return forkJoin([
          `card-images/${uid}-back`,
          `card-images/${uid}-front`
        ].map((url, i) => {
          if (cardBox.cards[uid][i === 0 ? 'front' : 'back']) {
            return this.as.ref(url).delete()
            .pipe(finalize(() => {})).toPromise();
          }
          return of().toPromise();
        })).pipe(
          switchMap(() => {
            if (Object.keys(cardBox.cards).length === 1) {
              cardBox.deleted = +Date.now();
              // return this.af.collection<any>(`pokemon-cards`)
              //   .doc(`${expansion}-${print}`).delete().then(() => true);
            }
            delete cardBox.cards[uid];
            cardBox.cards = JSON.stringify(cardBox.cards);
            cardBox.lastUpdated = +Date.now();
            return this.af.collection<any>(`pokemon-cards`)
              .doc(`${expansion}-${print}`).set(Object.assign({}, cardBox)).then(() => true);
          })
        );
      }),
      catchError(err => {
        console.error(err);
        return of(false);
      })
    );
  }
}
