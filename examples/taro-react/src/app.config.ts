export default {
  pages: ["pages/index/index", "pages/test2/index"],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  subPackages: [{
    "root": "package-test",
    "name": "Test",
    "pages": [
      "pages/test/index"
    ]
  }]
}
