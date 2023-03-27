// Note: this allows you to load svg files as from modules
declare module "*.svg" {
  const content: any;
  export default content;
}
