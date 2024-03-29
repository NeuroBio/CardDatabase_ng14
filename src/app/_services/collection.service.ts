import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { catchError, map, skip, skipWhile, take, tap } from 'rxjs/operators';
import { CardChunk } from '../_objects/card-chunk';
import { CardInstance, Population } from '../_objects/card-instance';
import { Checklist } from '../_objects/checklist';
import { Card } from '../_objects/expansion';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {

  allCards = new BehaviorSubject<any>(undefined);
  generations = new BehaviorSubject<any>(undefined);
  expansions = new BehaviorSubject<any>(undefined);
  checkLists = new BehaviorSubject<any[]>([]);
  masterList = new BehaviorSubject<CardChunk[]>([]);
  populationCount = new BehaviorSubject<Population>(new Population());

  activeList = 'Masterlist';
  processedChecklists: any = {};
  allowEdit = true;

  private lastChecked = {
    cards: 0,
    expansions: 0,
    checkLists: 0
  };
  private bestForm: any = { '1st': 0, shadowless: 1, 'UK 2000': 2, unlimited: 3, reverse: 4, standard: 5 };
  private bestCondition: any = { M: 0, NM: 1, LP: 2, MP: 3, HP: 4 };
  private changed: any = {};
  private initialized: boolean = false;

  constructor(
    private af: AngularFirestore,
    private auth: AuthService
    ) {
      // ensure that master is updated as needed when cards change
      this.allCards.subscribe(() => 
        Object.keys(this.changed).forEach(key => this.changed[key] = true));
  }

  load(): Promise<boolean> {
    return new Promise((resolve) => {
      forkJoin([
        this.getCards().pipe(take(1)),
        this.getExpansions().pipe(take(1)),
        this.getCheckLists().pipe(take(1))
      ]).pipe(tap(() => {
        // update checking time if exists
        const lastChecked = localStorage.getItem('lastChecked');
        const checks = lastChecked ? JSON.parse(lastChecked) : '';
        if (checks && this.notExpired(checks)) {
          // stored cache
          this.lastChecked = checks;
        }

        this.updateCards().pipe(skip(1)).subscribe();
        this.getExpansions().pipe(skip(1)).subscribe();
        this.getCheckLists().pipe(skip(1)).subscribe();
      }))
      .subscribe(() => {
        // doesn't call it initialized until all subs are working
        // console.log('initialized')
        this.initialized = true;
        resolve(true)
      });
    });
  }

  private getCards(): Observable<any> {
    // get cards from cache if possible
    return this.af.collection<any>('pokemon-cards').valueChanges()
      .pipe(
        map(cards => {
          this.getPopulation(cards);
          const cardObject: any = {};
          cards.forEach(cardType => {
            if (!cardType.deleted) {
              cardObject[`${cardType.expansionName}-${cardType.printNumber}`] = JSON.parse(cardType.cards);
            }
          });
          return cardObject;
        }),
        tap(cards => {
          this.allCards.next(cards);
      }));
  }

  private updateCards(): Observable<any> {
    // only read cards that changed, skip first check on cache, as the cache is the initial data
    // console.log('Last Updated: ', this.lastChecked.cards)
    // console.log(this.lastChecked)
    return this.af.collection<any>('pokemon-cards',
      ref => ref.where('lastUpdated', '>', this.lastChecked.cards))
      .valueChanges().pipe(
        skip(1),
        tap(cards => {
          const pop: any = this.populationCount.value;
          const master = this.allCards.value;
          cards.forEach(cardBox => {
            // get info for updating population
            let newLength = 0;
            let oldLength = 0;
            const type = this.expansions.value[cardBox.expansionName].cards[cardBox.printNumber - 1].cardType;

            // update cards
            if (master[`${cardBox.expansionName}-${cardBox.printNumber}`]) {
              oldLength = Object.keys(master[`${cardBox.expansionName}-${cardBox.printNumber}`]).length;
            }

            if (cardBox.deleted) {
              delete master[`${cardBox.expansionName}-${cardBox.printNumber}`];
            } else {
              // update cards in storage bin
              const newCards: any[] = JSON.parse(cardBox.cards);
              master[`${cardBox.expansionName}-${cardBox.printNumber}`] = newCards;
              newLength = Object.keys(newCards).length;
            }

            // update population values
            const numCards = newLength - oldLength;
            if (type === 'Special Energy') {
              pop.SpecialEnergy += numCards;
            } else if (type === 'Special Pokémon') {
              pop.Pokémon += numCards;
            } else {
              pop[type] += numCards;
            }
          });
          if (cards[0]) {
            this.allCards.next(master);
          }
          if (this.initialized) {
            this.updateLastChecked(true);
          }
          
          this.populationCount.next(pop);
        }
      ));
  }

  private getExpansions(): Observable<any> {
    return this.af.collection<any>('expansions',
      ref => ref.where('lastUpdated', '>', this.lastChecked.expansions))
      .valueChanges().pipe(
        tap(expansions => {
          if (expansions[0]) {
            // get existing data for use
            const exps = this.expansions.value ? this.expansions.value : {};
            const gens = this.generations.value ? this.generations.value : {};
            expansions.forEach(gen => {
              if (typeof gen.data === 'string') {

              } else {
                Object.keys(gen.data).forEach((key, i) => {
                  const exp = gen.data[key];

                  // load in generations for quick write access
                  if (i === 0) {
                    gens[exp.generation] = gen;
                  }
                  // unpack expansion data for quick read access
                  exps[exp.name] = exp;
                });
              }
            });
            this.generations.next(gens);
            this.expansions.next(exps);

            if (this.initialized) {
              this.updateLastChecked(false, true);
            }

          }
        })
      );
  }

  private getCheckLists(): Observable<Checklist[]> {
    return this.af.collection<Checklist>('check-lists',
      ref => ref.where('lastUpdated', '>', 0))
      .valueChanges()
        .pipe(tap(lists => {
          if (lists[0]) {
            this.checkLists.next(lists.filter(list => !list.deleted));
            if (this.initialized) {
              this.updateLastChecked(false, false, true);
            }
          }
        }));
  }


  private updateLastChecked(cards: boolean = false, exps: boolean = false, lists: boolean = false): void {
    if (cards) {
      this.lastChecked.cards = +Date.now();
    }
    if (exps) {
      this.lastChecked.expansions = +Date.now();
    }
    if (lists) {
      this.lastChecked.checkLists = +Date.now();
    }
    localStorage.setItem('lastChecked', JSON.stringify(this.lastChecked));
  }

  getMaster(): CardChunk[] {
    if (this.changed['Masterlist'] == false) {
      return this.masterList.value;
    }

    const cards = this.allCards.value;
    const cardChunks: CardChunk[] = [];
    // loop through all cards
    Object.keys(cards).forEach(key => {
      const splitInd = key.lastIndexOf('-');
      const keyParts = [key.substr(0, splitInd), key.substr(splitInd + 1)];

      // create card chunk based on print/expansion
      cardChunks.push(new CardChunk(
        +keyParts[1],
        this.expansions.value[keyParts[0]])
      );

      // load in the desired cards
      Object.keys(cards[key]).forEach(uid =>
        cardChunks[cardChunks.length - 1].owned.push(cards[key][uid]));
    });

    this.masterList.next(cardChunks);
    this.changed['Masterlist'] = false;
    return cardChunks;
  }

  getRawCheckList(listName: string): Checklist | void {
    try {
      const list = Object.assign({}, this.checkLists.value.find(li => li.name === listName));
      list.checkInfo = JSON.parse(list.checkInfo);
      return list as Checklist;
    } catch {
      // list does not exist
      return;
    }
  }

  getChecklistDisplay(listName: string): number {
    const list = this.getRawCheckList(listName);
    if (list && list.startOn !== undefined) {
      return list.startOn;
    } else {
      return 1;
    }
  }

  checkListExists(listName: string): boolean {
      return this.getRawCheckList(listName) ? true : false;
  }

  getCheckList(listName: string): CardChunk[] | void{
    const list: any = this.getRawCheckList(listName);
    if (!list) { // list does not exist
      return;
    } else if (this.processedChecklists[listName] && this.changed[listName] == false) {
      return this.processedChecklists[listName];
    }
    const cardChunks: CardChunk[] = [];
    const cards = this.allCards.value;
    const expansions = this.expansions.value;
    let requireUpdate = false;

    // for each card in a list
    list.cardKeys.forEach((key: string, i: number) => {
      const keyParts = key.split('-');

      // get the card type to start the cardchunk
      const newChunk = new CardChunk(+keyParts[1], expansions[keyParts[0]], list.checkInfo[i]);
      // if there is a card instance, get it and load it into the new chard chunk
      if (list.checkInfo[i].uid) {
        const cardType = cards[list.checkInfo[i].key];
        if (cardType && cardType[list.checkInfo[i].uid]) {
          newChunk.owned.push(cardType[list.checkInfo[i].uid]);
        } else {
          list.checkInfo[i] = '';
          delete newChunk.checkInfo;
          requireUpdate = true;
        }
      }
      cardChunks.push(newChunk);
    });

    if (requireUpdate && this.auth.isLoggedIn) {
      list.checkInfo = JSON.stringify(list.checkInfo);
      this.af.collection<any>('check-lists')
        .doc(`${list.name}`).set(Object.assign({}, list))
        .then(() => true).catch(() => false);
    }

    this.processedChecklists[listName] = cardChunks;
    this.changed[listName] = false;
    return cardChunks;
  }

  getActiveCard(exp: string, print: number): any {
    if (print && exp) {
      const card = this.expansions.value[exp].cards[print - 1];
      if (!card) {
        return null;
      } else {
        return card;
      }
    } else {
      return null;
    }
  }

  getChunk(key: string): CardInstance[] | null {
    const chunk = this.allCards.value[key];
    return chunk ? Object.values(chunk) : null;
  }

  getCard(key: string, uid: string): CardInstance {
    return this.allCards.value[key][uid];
  }

  getBestCard(cards: CardInstance[]): CardInstance {
    // get the best card based on 1) form and 2) condition
    let bestCard = cards[0];
    const isRareHolo = this.expansions.value[cards[0].expansionName]
      .cards[cards[0].printNumber - 1].rarity === 'rare-holo';

    cards.forEach((card: CardInstance) => {
      if (!bestCard) { // add first card
        bestCard = card;
        return;
      }

      if (this.bestForm[card.form] < this.bestForm[bestCard.form]) { // get better form
        // catch case where holos are better than reverse rares
        if (isRareHolo && bestCard.form === 'standard' && card.form === 'reverse') {
          return;
        }

        // standrd cases
        bestCard = card;
        return;
      } else if (this.bestForm[card.form] === this.bestForm[bestCard.form]) { // same form
        // check condition
        if (this.bestCondition[card.condition] < this.bestCondition[bestCard.condition]) { // better condition
          bestCard = card;
        }
      }
    });

    return bestCard;
  }

  getExpansionNames(): string[] {
    const exp = this.expansions.value;
    return Object.keys(exp).sort((a, b) =>
    // lower gens higher
    +exp[a].generation < +exp[b].generation ? -1 :
    +exp[a].generation > +exp[b].generation ? 1 :

    // same gen, check release order
    +exp[a].release < +exp[b].release ? -1 : 1
    );
  }

  private getPopulation(cards: any[]): void {
    this.expansions.pipe(
      skipWhile(res => !res),
      take(1)).subscribe(exp => {
        const newPop: any = new Population();
        cards.forEach((cardStorage) => {
          const cardType: string = exp[cardStorage.expansionName].cards[cardStorage.printNumber - 1].cardType;
          const numCards = Object.keys(JSON.parse(cardStorage.cards)).length;
          if (cardType === 'special energy') {
            newPop.SpecialEnergy += numCards;
          } else if (cardType === 'Special Pokémon') {
            newPop.Pokémon += numCards;
          } else {
            newPop[cardType] += numCards;
          }
        });
        this.populationCount.next(newPop);
    });
  }

  private notExpired(checks: any): boolean {
    const now = +Date.now();
    if ((now - checks.cards) / 1000 / 60 / 60 > 12
      || (now - checks.expansions) / 1000 / 60 / 60 > 12
      || (now - checks.checkLists) / 1000 / 60 / 60 > 12) {
        return false;
    }
    return true;
  }

}



        // const exp = this.expansions.value;
        // const restructure = {};
        // Object.keys(exp).forEach(key => {
        //     if (!restructure[`Gen-${exp[key].generation}`]) {
        //       restructure[`Gen-${exp[key].generation}`] = {};
        //       restructure[`Gen-${exp[key].generation}`]['lastUpdated'] = +Date.now();
        //       restructure[`Gen-${exp[key].generation}`]['data'] = {};
        //     }
        //     restructure[`Gen-${exp[key].generation}`]['data'][exp[key].name] = exp[key];
        //   });
        //   Object.keys(restructure).forEach(key => {
        //     console.log(key)
        //     console.log(restructure[key])
        //     return this.af.collection<any>('expansions').doc(key).set(restructure[key])
        //     .then(() => true)
        //     .catch(err => {
        //       console.error(err);
        //       return false;
        //   });
        // });
