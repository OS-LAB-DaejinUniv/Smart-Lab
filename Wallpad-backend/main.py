# flask server
# sudo python3 main.py -> server run

from flask import Flask

app = Flask(__name__)

@app.route('/')
def main():
    return 'server start'

@app.route('/board')
def board():
    return '게시판 페이지?'

if __name__ == '__main__':
    app.run(debug=True,port=80,host='0.0.0.0')
