import { useEffect } from 'react';

const setMetaTag = (attrName, attrValue, content) => {
  if (!content) return;
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

export default function usePageMeta(title, description, options = {}) {
  useEffect(() => {
    if (title) document.title = `${title} | HEXA Marketplace`;
    if (description) setMetaTag('name', 'description', description);

    const fullUrl = options.url || window.location.href;
    const ogTitle = title || 'HEXA Digital Marketplace';
    const ogDesc = description || 'Buy gaming subscriptions, gift cards, software licenses and digital products with instant delivery.';
    const ogImage = options.image || '/assets/og-banner.png';
    const ogType = options.type || 'website';

    // OpenGraph tags
    setMetaTag('property', 'og:title', ogTitle);
    setMetaTag('property', 'og:description', ogDesc);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:url', fullUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'HEXA');

    if (options.price) {
      setMetaTag('property', 'product:price:amount', String(options.price));
      setMetaTag('property', 'product:price:currency', options.currency || 'BDT');
    }

    // Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', ogTitle);
    setMetaTag('name', 'twitter:description', ogDesc);
    setMetaTag('name', 'twitter:image', ogImage);

    // JSON-LD Structured Data Schema for Google Search Rich Snippets
    let scriptTag = document.getElementById('hexa-jsonld-schema');
    if (options.jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'hexa-jsonld-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(options.jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      const existingScript = document.getElementById('hexa-jsonld-schema');
      if (existingScript) existingScript.remove();
    };
  }, [title, description, options.image, options.type, options.url, options.price, options.currency, options.jsonLd]);
}
