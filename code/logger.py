#!/usr/bin/env python
"""
General logger for scripts.
"""
import logging
import os

class ScraperLogger:
  """
  Class for logging.
  """
  log_file = os.path.join(os.path.dirname(__file__), '../logs/scraping.log')
  formatter = logging.Formatter('%(asctime)s | %(name)s | %(levelname)s | %(message)s')

  def __init__(self, name):
    """
    Constructor for logger.
    """
    if not os.path.exists(os.path.dirname(self.log_file)):
      os.makedirs(os.path.dirname(self.log_file))

    self.logger = logging.getLogger(name)
    self.logger.setLevel(logging.DEBUG)

    # File handler
    fh = logging.FileHandler(self.log_file)
    fh.setLevel(logging.DEBUG)

    # Commandline handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)

    # Formatting
    fh.setFormatter(self.formatter)
    ch.setFormatter(self.formatter)

    self.logger.addHandler(fh)
    self.logger.addHandler(ch)