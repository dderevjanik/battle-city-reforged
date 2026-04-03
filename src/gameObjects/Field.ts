import { GameObject } from '../core/GameObject';
import * as config from '../config';

export class Field extends GameObject {
  constructor() {
    super(config.FIELD_SIZE, config.FIELD_SIZE);
  }
}
