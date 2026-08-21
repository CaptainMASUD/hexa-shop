import Counter from '../models/Counter.js';
export const nextSequence = async (key) => (await Counter.findOneAndUpdate({key},{$inc:{value:1}},{upsert:true,new:true,setDefaultsOnInsert:true})).value;
