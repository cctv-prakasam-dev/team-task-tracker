declare module "docxtemplater-image-module-free" {
  interface ImageModuleOptions {
    centered?: boolean;
    getImage: (tagValue: any, tagName?: string) => Buffer;
    getSize: (img: Buffer, tagValue: any, tagName: string) => [number, number];
  }

  class ImageModule {
    constructor(options: ImageModuleOptions);
  }

  export default ImageModule;
}
