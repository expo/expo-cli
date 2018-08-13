import _ from 'lodash';

export default function renderIntentFilters(intentFilters) {
  // returns an array of <intent-filter> tags:
  // [
  //   `<intent-filter>
  //     <data android:scheme="exp"/>
  //     <data android:scheme="exps"/>
  //
  //     <action android:name="android.intent.action.VIEW"/>
  //
  //     <category android:name="android.intent.category.DEFAULT"/>
  //     <category android:name="android.intent.category.BROWSABLE"/>
  //   </intent-filter>`,
  //   ...
  // ]
  return intentFilters.map(intentFilter => {
    const autoVerify = intentFilter.autoVerify ? ' android:autoVerify="true"' : '';

    return `<intent-filter${autoVerify}>
      ${renderIntentFilterData(intentFilter.data)}
      <action android:name="android.intent.action.${intentFilter.action}"/>
      ${renderIntentFilterCategory(intentFilter.category)}
    </intent-filter>`;
  });
};

function renderIntentFilterDatumEntries(datum) {
  return _.toPairs(datum).map(entry => `android:${entry[0]}=\"${entry[1]}\"`).join(' ');
}

function renderIntentFilterData(data) {
  return (Array.isArray(data) ? data : [data]).map(datum =>
    `<data ${renderIntentFilterDatumEntries(datum)}/>`
  ).join('\n');
}

function renderIntentFilterCategory(category) {
  return (Array.isArray(category) ? category : [category]).map(cat =>
    `<category android:name="android.intent.category.${cat}"/>`
  ).join('\n');
}
