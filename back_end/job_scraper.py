import requests
from bs4 import BeautifulSoup
import time
import urllib.parse as urlparse
from typing import Optional, Dict, Any

class JobAdScraper:
    """
    A simple web scraper for extracting job ad content from URLs.
    """
    
    def __init__(self):
        self.session = requests.Session()
        # Set a user agent to avoid being blocked
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_job_ad(self, url: str) -> Dict[str, Any]:
        """
        Scrape job ad content from a URL.
        
        Args:
            url: The URL to scrape
            
        Returns:
            Dict containing the scraped content and metadata
        """
        try:
            # Validate URL
            parsed = urlparse.urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError("Invalid URL format")
            
            # Add timeout and reasonable delays
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            # Parse HTML content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "noscript"]):
                script.decompose()
            
            # Extract text content
            text_content = self._extract_job_content(soup, url)
            
            return {
                "success": True,
                "url": url,
                "content": text_content,
                "title": soup.title.string.strip() if soup.title else None,
                "scraped_at": time.time()
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "url": url,
                "error": f"Request failed: {str(e)}",
                "scraped_at": time.time()
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "error": f"Scraping failed: {str(e)}",
                "scraped_at": time.time()
            }
    
    def _extract_job_content(self, soup: BeautifulSoup, url: str) -> str:
        """
        Extract relevant job content from parsed HTML.
        Uses site-specific selectors when possible, falls back to generic extraction.
        """
        
        # Site-specific extraction patterns
        content_selectors = self._get_site_selectors(url)
        
        # Try site-specific selectors first
        for selector in content_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    text_parts = []
                    for element in elements:
                        text = element.get_text(strip=True)
                        if text and len(text) > 50:  # Filter out very short text
                            text_parts.append(text)
                    
                    if text_parts:
                        return '\n\n'.join(text_parts)
            except Exception:
                continue
        
        # Fallback to generic extraction
        return self._generic_content_extraction(soup)
    
    def _get_site_selectors(self, url: str) -> list:
        """
        Get site-specific CSS selectors for known job boards.
        """
        domain = urlparse.urlparse(url).netloc.lower()
        
        selectors = {
            'linkedin.com': [
                '.jobs-box__html-content',
                '.job-view-layout',
                '.jobs-description__content'
            ],
            'indeed.com': [
                '#jobDescriptionText',
                '.jobDescriptionContent',
                '.jobsearch-jobDescriptionText'
            ],
            'glassdoor.com': [
                '#JobDescContainer',
                '.jobDescriptionContent',
                '#job-description'
            ],
            'ziprecruiter.com': [
                '.jobDescriptionSection',
                '.jobDescription'
            ],
            'monster.com': [
                '#JobDescription',
                '.job-description'
            ],
            'simplyhired.com': [
                '.viewjob-description',
                '#job-description'
            ]
        }
        
        # Return selectors for matching domain
        for site_domain, site_selectors in selectors.items():
            if site_domain in domain:
                return site_selectors
        
        return []
    
    def _generic_content_extraction(self, soup: BeautifulSoup) -> str:
        """
        Generic content extraction when site-specific selectors fail.
        """
        # Try common job description containers
        generic_selectors = [
            '[class*="job-description"]',
            '[class*="jobDescription"]',
            '[class*="job_description"]',
            '[id*="job-description"]',
            '[id*="jobDescription"]',
            '[id*="job_description"]',
            'main',
            'article',
            '.content',
            '.main-content',
            '#content'
        ]
        
        for selector in generic_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    # Get the largest text block
                    best_element = max(elements, key=lambda el: len(el.get_text()))
                    text = best_element.get_text(separator='\n', strip=True)
                    if len(text) > 200:  # Ensure we have substantial content
                        return text
            except Exception:
                continue
        
        # Last resort: get all text from body
        body = soup.find('body')
        if body:
            # Remove navigation, footer, and other non-content elements
            for tag in body.find_all(['nav', 'footer', 'header', 'aside', '.navigation', '.nav', '.footer', '.header']):
                tag.decompose()
            
            text = body.get_text(separator='\n', strip=True)
            return text
        
        # Absolute fallback
        return soup.get_text(separator='\n', strip=True)
