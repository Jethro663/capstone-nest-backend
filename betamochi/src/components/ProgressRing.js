import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../styles/colors';
import { spacing } from '../styles/commonStyles';

const ProgressRing = ({
  percentage = 0,
  width = 100,
  height = 100,
  color = colors.primary,
  backgroundColor = colors.backgroundLight,
  strokeWidth = 8,
  showLabel = true,
}) => {
  const radius = Math.min(width, height) / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background circle */}
        <Circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: [{ rotate: '-90deg' }],
            transformOrigin: `${width / 2}px ${height / 2}px`,
          }}
        />
      </Svg>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.percentageText, { color }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ProgressRing;
