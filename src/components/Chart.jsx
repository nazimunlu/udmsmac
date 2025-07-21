import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Chart = ({ data, type }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            {type === 'bar' ? (
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#82ca9d" name="Income" />
                    <Bar dataKey="expenses" fill="#8884d8" name="Expenses" />
                </BarChart>
            ) : (
                // You can add other chart types like PieChart here
                <div>Chart type not supported</div>
            )}
        </ResponsiveContainer>
    );
};

export default Chart;
