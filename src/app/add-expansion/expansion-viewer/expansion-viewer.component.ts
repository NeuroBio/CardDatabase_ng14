import { Component, Input, OnInit } from '@angular/core';
import { Card } from 'src/app/_objects/expansion';

@Component({
  selector: 'app-expansion-viewer',
  templateUrl: './expansion-viewer.component.html',
  styleUrls: ['./expansion-viewer.component.scss']
})
export class ExpansionViewerComponent implements OnInit {

  @Input() cards: Card[] = [];

  constructor() { }

  ngOnInit(): void {
  }

}
