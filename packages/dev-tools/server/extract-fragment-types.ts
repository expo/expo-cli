import fs from 'fs';
// @ts-ignore
import { graphql } from 'graphql';

import GraphQLSchema from './graphql/GraphQLSchema';

graphql(
  GraphQLSchema,
  `
    {
      __schema {
        types {
          kind
          name
          possibleTypes {
            name
          }
        }
      }
    }
  `
).then((result: any) => {
  // here we're filtering out any type information unrelated to unions or interfaces
  const filteredData = result.data.__schema.types.filter(
    (type: any) => type.possibleTypes !== null
  );
  result.data.__schema.types = filteredData;
  fs.writeFile('./fragmentTypes.json', JSON.stringify(result.data), err => {
    if (err) {
      console.error('Error writing fragmentTypes file', err);
    } else {
      console.log('Fragment types successfully extracted!');
    }
  });
});
