export class ArrayUtils {
  public static flatten(array: any[]): any[] {
    let result = [];

    array.forEach((item) => {
      if (Array.isArray(item)) {
        result = result.concat(item);
      } else {
        result.push(item);
      }
    });

    return result;
  }
}
