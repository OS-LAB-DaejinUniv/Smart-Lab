from selenium import webdriver
import requests

driver = webdriver.Chrome()
driver.get("https://www.daejin.ac.kr/daejin/1045/subview.do")
print(driver.get_cookies())