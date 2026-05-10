import web from './vitals';

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    web.getCLS(onPerfEntry);
    web.getFID(onPerfEntry);
    web.getFCP(onPerfEntry);
    web.getLCP(onPerfEntry);
    web.getTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
