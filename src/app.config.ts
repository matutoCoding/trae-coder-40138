export default defineAppConfig({
  pages: [
    'pages/schedule/index',
    'pages/pricing/index',
    'pages/bills/index',
    'pages/settings/index',
    'pages/booking-detail/index',
    'pages/bill-detail/index',
    'pages/table-edit/index',
    'pages/game-manage/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '桌游吧管家',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FFF8F3'
  },
  tabBar: {
    color: '#8C7878',
    selectedColor: '#FF7A45',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/schedule/index',
        text: '排期'
      },
      {
        pagePath: 'pages/pricing/index',
        text: '计费'
      },
      {
        pagePath: 'pages/bills/index',
        text: '账单'
      },
      {
        pagePath: 'pages/settings/index',
        text: '管理'
      }
    ]
  }
})
