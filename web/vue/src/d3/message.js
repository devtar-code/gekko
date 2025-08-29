export const draw = function(message) {
  d3.select("#chart").append("text")
      .attr('class', 'message')
      .attr('x', 150)
      .attr('y', 150)
      .style('fill', '#d1d4dc')
      .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('text-anchor', 'middle')
      .text(message);
}

export const clear = function() {
  d3.select("#chart").selectAll('text.message').remove();
}