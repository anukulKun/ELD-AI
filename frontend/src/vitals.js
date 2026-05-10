import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const web = {
  getCLS: (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      getCLS(onPerfEntry);
    }
  },
  getFID: (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      getFID(onPerfEntry);
    }
  },
  getFCP: (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      getFCP(onPerfEntry);
    }
  },
  getLCP: (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      getLCP(onPerfEntry);
    }
  },
  getTTFB: (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      getTTFB(onPerfEntry);
    }
  },
};

export default web;
