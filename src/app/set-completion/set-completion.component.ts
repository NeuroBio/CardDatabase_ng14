import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SetExpansion } from '../_objects/expansion';
import { CollectionService } from '../_services/collection.service';

export class SetInfo {
  expName: string;
  rarityOwned: { [key: string]: any };
  rarityOwnedPokemon:  { [key: string]: any };
  rarityTotal:  { [key: string]: any };
  rarityTotalPokemon:  { [key: string]: any }
  cardCount: number;
  unique: number;
  ownership: number[];
  print: number;
  total: number;
  totalPokemon: number;
  ownedPokemon: number;

  constructor(expName: string, rarityOwned: { [key: string]: any }, rarityOwnedPokemon: { [key: string]: any },
    rarityTotal: { [key: string]: any }, rarityTotalPokemon: { [key: string]: any },
    cardCount: number, unique: number, ownership: number[], print: number, total: number, totalPokemon: number, ownedPokemon: number) {
      this.expName = expName;
      this.rarityOwned = rarityOwned;
      this.rarityOwnedPokemon = rarityOwnedPokemon;
      this.rarityTotal = rarityTotal;
      this.rarityTotalPokemon = rarityTotalPokemon;
      this.cardCount = cardCount;
      this.unique = unique;
      this.ownership = ownership;
      this.print = print;
      this.total = total;
      this.totalPokemon = totalPokemon;
      this.ownedPokemon = ownedPokemon;
    }
};

@Component({
  selector: 'app-set-completion',
  templateUrl: './set-completion.component.html',
  styleUrls: ['./set-completion.component.scss']
})

export class SetCompletionComponent implements OnInit {

  expansions: SetExpansion[];
  expansionNames: string[ ];
  cards: any;
  checkCard?: string;
  setInfo: { [key: string]: any } = { };
  activeSetInfo: SetInfo;
  activeSet: FormControl;
  setSubscription: Subscription;

  constructor(
    private collectionserv: CollectionService,
    private fb: FormBuilder) {
      this.activeSet = this.fb.control('Base Set');
      this.setSubscription = this.activeSet.valueChanges
        .subscribe(name => this.getSetInfo(name));
      this.expansions = this.collectionserv.expansions.value;
      this.expansionNames = this.collectionserv.getExpansionNames();
      this.cards = this.collectionserv.allCards.value;
      this.getSetInfo('Base Set');
      this.activeSetInfo = this.setInfo['Base Set'];
    }

  ngOnInit(): void {

  }

  getSetInfo(expName: any): void {
    // create set data if it does not exist
    if (!this.setInfo[expName]) {
      const exp = this.expansions[expName];
      const rarityOwned: { [key: string]: any } = {};
      const rarityOwnedPokemon: { [key: string]: any } = {};
      const rarityTotal: { [key: string]: any } = { };
      const rarityTotalPokemon: { [key: string]: any } = {};
      const ownership: number[] = [];
      let cardCount = 0;
      let unique = 0;
      let uniquePokemon = 0;

      exp.cards.forEach(card => {
        const activeCard = exp.cards[card.printNumber - 1];

        // get stats for all cards in set by rarity
        if (!rarityTotal[activeCard.rarity]) {
          rarityTotal[activeCard.rarity] = 0;
          rarityTotalPokemon[card.rarity] = 0;
        }
        rarityTotal[activeCard.rarity] += 1;
        if (activeCard.cardType === 'Pokémon') {
          rarityTotalPokemon[card.rarity] += 1;
        }

        // get stats based on card instances
        const instances = this.cards[`${expName}-${card.printNumber}`];
        if (instances) {
          const numCards = Object.keys(instances).length;
          unique += 1;
          if (activeCard.cardType === 'Pokémon' && activeCard.rarity !== 'Secret Rare') {
            uniquePokemon += 1
          }
          cardCount += numCards;
          ownership.push(numCards);
          if (!rarityOwned[card.rarity]) {
            rarityOwned[card.rarity] = 0;
            rarityOwnedPokemon[card.rarity] = 0;
          }
          rarityOwned[card.rarity] += 1;
          if (activeCard.cardType === 'Pokémon' && activeCard.rarity !== 'Secret Rare') {
            rarityOwnedPokemon[card.rarity] += 1;
          }
        } else {
          ownership.push(0);
        }
      });

      this.setInfo[expName] =  { expName, rarityOwned, rarityOwnedPokemon,
        rarityTotal, rarityTotalPokemon,
        cardCount, unique, ownership, print: exp.numCards,
        total: exp.cards.length, totalPokemon: uniquePokemon,
        ownedPokemon: exp.cards.filter(card => card.cardType === 'Pokémon').length
      };
    }

    // set the active data
    this.activeSetInfo = this.setInfo[expName];
  }

  getCardDetails(print: number): void {
    const card = this.expansions[this.activeSet.value].cards[print];
    this.checkCard = `${card.cardTitle}-${card.rarity}`;
  }

  getCompletionPercent(have: number, total: number): number {
    if (!have) {
      return 0;
    }
    return Math.round(have / total * 10000) / 100;
  }

  isPokemon(index: number): boolean {
    const card = this.expansions[this.activeSet.value].cards[index];
    return (card.cardType === 'Pokémon' && card.rarity !== 'Secret Rare');
  }

}
