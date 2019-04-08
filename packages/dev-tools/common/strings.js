import slugifyLib from 'slugify';

const appendZero = i => {
  if (i < 10) {
    i = `0${i}`;
  }

  return i;
};

// NOTE(jim): Source: https://gist.github.com/mathewbyrne/1280286
export const createSlug = text => {
  const a = 'æøåàáäâèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
  const b = 'aoaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special chars
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const formatTime = dateString => new Date(dateString).toLocaleTimeString('en-US');

export const formatTimeMilitary = dateString => {
  const date = new Date(dateString);

  const h = appendZero(date.getHours());
  const m = appendZero(date.getMinutes());
  return `${h}:${m}`;
};

export const isEmptyOrNull = text => {
  return !text || !text.trim();
};

export const slugify = string => {
  return slugifyLib(string, {
    lower: true,
  });
};
