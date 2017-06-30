var ctx = document.getElementById("canvas").getContext('2d');
var myChart = new Chart (ctx, {
  type: 'line',
  data: {
    labels: [#{xvalues}],
    datasets: [{
      data: [#{yvalues}],
      label: "#{label}",
      borderColor: "#3e95cd",
      fill: false
    }]
  },
  options: {}
});
