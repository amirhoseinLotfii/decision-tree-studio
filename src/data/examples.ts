import launch from './launch.json';
import fa from './launch-fa.json';
import { validateDocument } from '../domain/schema';
export const launchExample = validateDocument(launch);
export const persianExample = validateDocument(fa);
export const examples = [launchExample, persianExample];
