const rawMarketData = `
5274	信驊	11500	▲590.00	+5.41%	-4.56%	4.95%	11640	11950	11410	10910	298	34.270
6515	穎崴	8450	▲260.00	+3.17%	17.20%	5.37%	8350	8450	8010	8190	634	53.573
3653	健策	3945	▼-5.00	-0.13%	1.15%	6.58%	4150	4170	3910	3950	1,042	41.107
7769	鴻勁	3865	▲145.00	+3.90%	-7.09%	2.96%	3850	3930	3820	3720	806	31.152
6669	緯穎	3760	▲35.00	+0.94%	-0.13%	3.22%	3820	3855	3735	3725	952	35.795
6223	旺矽	3750	▲80.00	+2.18%	2.32%	4.36%	3850	3850	3690	3670	1,517	56.888
2059	川湖	3615	▲95.00	+2.70%	1.12%	3.69%	3550	3680	3550	3520	744	26.896
6510	精測	3195	▼-5.00	-0.16%	-10.00%	6.56%	3315	3330	3120	3200	862	27.541
3661	世芯-KY	3150	▲40.00	+1.29%	-2.17%	3.38%	3230	3250	3145	3110	971	30.587
2383	台光電	2845	▲160.00	+5.96%	-1.56%	5.03%	2790	2915	2780	2685	3,176	90.357
3529	力旺	2785	▲250.00	+9.86%	0.36%	4.93%	2660	2785	2660	2535	662	18.437
3131	弘塑	2660	▲240.00	+9.92%	17.70%	0.83%	2660	2660	2640	2420	352	9.363
3443	創意	2475	▼-30.00	-1.20%	-5.17%	6.39%	2575	2635	2475	2505	2,869	71.008
3008	大立光	2220	▼-20.00	-0.89%	-4.31%	3.79%	2285	2295	2210	2240	693	15.385
3533	嘉澤	2150	▲195.00	+9.97%	5.91%	6.14%	2040	2150	2030	1955	2,916	62.694
6442	光聖	2125	▲190.00	+9.82%	10.10%	3.36%	2085	2125	2060	1935	2,136	45.390
3017	奇鋐	2100	▲155.00	+7.97%	4.22%	4.37%	2020	2100	2015	1945	5,322	111.762
6805	富世達	1905	▲70.00	+3.81%	-3.54%	5.72%	1900	1945	1840	1835	2,230	42.482
2330	台積電	1845	▲35.00	+1.93%	-0.27%	1.66%	1865	1875	1845	1810	40,916	754.900
7734	印能科技	1825	▲165.00	+9.94%	0.55%	5.72%	1730	1825	1730	1660	361	6.588
3665	貿聯-KY	1805	▲75.00	+4.34%	4.94%	6.07%	1770	1840	1735	1730	4,191	75.648
8299	群聯	1725	▲40.00	+2.37%	-11.99%	4.75%	1770	1780	1700	1685	4,545	78.401
2345	智邦	1685	▲150.00	+9.77%	5.97%	6.84%	1580	1685	1580	1535	6,736	113.502
2360	致茂	1625	▲145.00	+9.80%	1.88%	5.74%	1545	1625	1540	1480	2,223	36.124
2454	聯發科	1620	--	--	-3.57%	2.78%	1665	1665	1620	1620	5,834	94.511
7751	竑騰	1570	▲55.00	+3.63%	-5.14%	1.98%	1595	1600	1570	1515	38	0.597
2308	台達電	1550	▲135.00	+9.54%	6.53%	4.95%	1485	1555	1485	1415	15,212	235.786
3081	聯亞	1540	▲140.00	+10.00%	0.00%	0.00%	1540	1540	1540	1400	175	2.695
3491	昇達科	1410	▲125.00	+9.73%	0.71%	5.06%	1345	1410	1345	1285	344	4.850
7750	新代	1265	▲10.00	+0.80%	-12.15%	5.58%	1290	1330	1260	1255	418	5.288
6739	竹陞科技	1200	▲70.00	+6.19%	-0.83%	5.75%	1180	1225	1160	1130	513	6.156
6640	均華	1180	▲105.00	+9.77%	7.76%	5.58%	1140	1180	1120	1075	448	5.286
6683	雍智科技	1180	▲80.00	+7.27%	0.85%	5.00%	1180	1210	1155	1100	217	2.561
5269	祥碩	1175	▲20.00	+1.73%	-2.49%	1.73%	1180	1190	1170	1155	446	5.241
6781	AES-KY	1125	▲35.00	+3.21%	12.50%	3.67%	1140	1165	1125	1090	1,672	18.810
3324	雙鴻	1035	▲30.00	+2.99%	-3.27%	4.98%	1040	1075	1025	1005	4,345	44.971
5289	宜鼎	1015	▲37.00	+3.78%	-23.97%	3.58%	1015	1015	980	978	712	7.227
1590	亞德客-KY	1010	▲57.00	+5.98%	3.27%	2.20%	990	1010	989	953	686	6.929
6187	萬潤	955	▲86.00	+9.90%	28.19%	7.71%	907	955	888	869	7,985	76.257
2404	漢唐	943	▲8.00	+0.86%	3.06%	3.96%	960	974	937	935	5,611	52.912
1519	華城	926	▲45.00	+5.11%	0.43%	4.09%	902	931	895	881	2,796	25.891
2368	金像電	922	▲34.00	+3.83%	-8.26%	4.17%	919	950	913	888	8,441	77.826
8210	勤誠	904	▲36.00	+4.15%	1.35%	3.92%	886	917	883	868	2,948	26.650
3163	波若威	898	▲59.00	+7.03%	-2.18%	4.41%	921	922	885	839	949	8.522
4749	新應材	896	▲33.00	+3.82%	-1.97%	3.48%	884	907	877	863	2,161	19.363
7728	光焱科技	830	▲28.00	+3.49%	12.62%	6.86%	842	872	817	802	890	7.387
8996	高力	820	▲48.00	+6.22%	-13.77%	8.29%	795	840	776	772	4,019	32.956
5536	聖暉*	800	▲50.00	+6.67%	17.65%	3.20%	796	813	789	750	4,152	33.216
6944	兆聯實業	785	▲9.00	+1.16%	-6.44%	3.61%	798	813	785	776	826	6.484
6409	旭隼	758	▲18.00	+2.43%	2.43%	1.62%	759	760	748	740	557	4.222
3293	鈊象	749	▲14.00	+1.90%	0.81%	0.95%	745	749	742	735	1,069	8.007
3563	牧德	744	▲67.00	+9.90%	1.22%	6.79%	699	744	698	677	2,860	21.278
3363	上詮	678	▲13.00	+1.95%	1.50%	4.81%	693	710	678	665	713	4.834
4583	台灣精銳	659	▲21.00	+3.29%	2.97%	2.98%	656	659	640	638	143	0.942
7805	威聯通	655	▲12.00	+1.87%	-0.91%	1.87%	648	656	644	643	42	0.275
6139	亞翔	654	▲22.00	+3.48%	11.41%	4.11%	659	672	646	632	8,904	58.232
6446	藥華藥	640	▲20.00	+3.23%	-0.93%	2.10%	634	644	631	620	1,093	6.995
7717	萊德光電-KY	638	▲58.00	+10.00%	-6.86%	3.45%	618	638	618	580	96	0.612
6691	洋基工程	615	▲10.00	+1.65%	0.00%	2.31%	620	627	613	605	631	3.881
6274	台燿	580	▲39.00	+7.21%	-0.68%	5.36%	558	585	556	541	15,291	88.688
6584	南俊國際	568	▲28.00	+5.19%	24.42%	8.70%	530	577	530	540	502	2.851
6949	沛爾生醫-創	568	▲43.00	+8.19%	-2.57%	7.81%	565	568	527	525	139	0.790
2357	華碩	565	--	--	-2.25%	2.65%	576	577	562	565	3,836	21.673
8046	南電	540	▲49.00	+9.98%	-3.74%	6.11%	510	540	510	491	10,725	57.915
5904	寶雅	518	▲4.00	+0.78%	0.78%	1.56%	515	520	512	514	318	1.647
6531	愛普*	511	▲10.00	+2.00%	-7.26%	4.19%	516	525	504	501	3,456	17.660
3693	營邦	509	▲29.00	+6.04%	-12.69%	4.38%	501	509	488	480	920	4.683
3037	欣興	506	▲46.00	+10.00%	-12.91%	4.02%	487.5	506	487.5	460	5,002	25.310
6526	達發	501	▲20.50	+4.27%	-0.20%	2.91%	493	504	490	480.5	404	2.024
2207	和泰車	499	▲15.50	+3.21%	2.78%	3.83%	504	505	486.5	483.5	488	2.435
3583	辛耘	497	▲45.00	+9.96%	19.33%	6.97%	465.5	497	465.5	452	4,476	22.246
4966	譜瑞-KY	497	▲2.50	+0.51%	-1.19%	2.33%	506	506	494.5	494.5	313	1.556
2379	瑞昱	489	▲8.50	+1.77%	2.62%	2.08%	488.5	490.5	480.5	480.5	2,966	14.504
4768	晶呈科技	485	▲44.00	+9.98%	-8.49%	7.14%	461.5	485	453.5	441	1,218	5.907
4971	IET-KY	479	▲43.50	+9.99%	3.68%	1.95%	470.5	479	470.5	435.5	418	2.002
6643	M31	468.5	▲8.50	+1.85%	-7.23%	3.70%	473	485	468	460	728	3.411
3406	玉晶光	468	▲13.50	+2.97%	4.35%	2.86%	464	473	460	454.5	1,821	8.522
6472	保瑞	461	▲5.00	+1.10%	-4.55%	2.41%	468.5	468.5	457.5	456	365	1.683
1560	中砂	459.5	▲13.50	+3.03%	-1.61%	3.25%	454	466.5	452	446	1,854	8.519
7744	崴寶	450.5	▼-8.00	-1.74%	-6.54%	6.22%	468.5	474	445.5	458.5	113	0.509
6488	環球晶	450	▲18.50	+4.29%	-4.66%	2.55%	444.5	450	439	431.5	1,157	5.207
00631L	元大台灣50正2	443.15	--	--	-10.66%	0.00%	443.15	443.15	443.15	443.15	0	0.000
4991	環宇-KY	437	▲39.50	+9.94%	12.48%	1.26%	434	437	432	397.5	2,624	11.467
6830	汎銓	431	▲20.50	+4.99%	2.86%	11.57%	433	448	400.5	410.5	6,139	26.459
4979	華星光	425.5	▲38.50	+9.95%	8.68%	3.62%	411.5	425.5	411.5	387	15,004	63.842
3680	家登	412.5	▲26.50	+6.87%	4.96%	5.18%	395	415	395	386	1,452	5.990
7795	長廣	412	▲9.00	+2.23%	4.17%	5.09%	410	426.5	406	403	617	2.542
3260	威剛	405	▲18.50	+4.79%	-22.86%	5.17%	388	408	388	386.5	8,027	32.509
2467	志聖	404.5	▲36.50	+9.92%	8.88%	6.66%	388	404.5	380	368	6,939	28.068
6788	華景電	401	▲23.50	+6.23%	8.09%	6.89%	390	409	383	377.5	6,822	27.356
7749	意騰-KY	395.5	▲6.50	+1.67%	-7.59%	1.54%	394	398	392	389	83	0.328
4728	雙美	390	▼-1.00	-0.26%	0.26%	0.77%	391	393	390	391	3	0.012
7799	禾榮科	389.5	▼-3.50	-0.89%	-4.53%	3.69%	402	402	387.5	393	343	1.336
7610	聯友金屬-創	380	▲23.50	+6.59%	18.75%	11.50%	365	392	351	356.5	1,775	6.745
3034	聯詠	377.5	▲7.50	+2.03%	1.07%	1.35%	377.5	379	374	370	1,290	4.870
6894	衛司特	375.5	▲9.50	+2.60%	0.27%	5.33%	370.5	390	370.5	374.5	293	1.100
6291	沛亨	372	▲33.50	+9.90%	2.90%	5.17%	360	372	354.5	338.5	2,234	8.310
5234	達興材料	367	▲11.00	+3.09%	-6.38%	3.79%	369	378	364.5	356	635	2.330
6561	是方	363	▲10.00	+2.83%	3.71%	3.68%	363.5	364.5	351.5	353	285	1.035
6831	邁科	363	▲25.00	+7.40%	9.01%	6.21%	349	369	348	338	1,158	4.204
3044	健鼎	357	▲16.00	+4.69%	-2.46%	2.64%	358	363	354	341	3,616	12.909
3711	日月光投控	352	▲19.50	+5.86%	1.44%	3.16%	349.5	357.5	347	332.5	16,486	58.031
3189	景碩	351.5	▲31.00	+9.67%	-8.34%	5.62%	333.5	351.5	333.5	320.5	4,536	15.944
3167	大量	348.5	▲31.50	+9.94%	-2.38%	2.37%	341	348.5	341	317	770	2.683
3211	順達	347.5	▲31.50	+9.97%	14.50%	4.27%	335	347.5	334	316	16,643	57.834
6121	新普	347	--	--	-1.00%	1.73%	349	350.5	344.5	347	361	1.253
1476	儒鴻	346	▼-2.00	-0.57%	-7.11%	2.87%	355	356	346	348	1,393	4.820
3105	穩懋	344.5	▲31.00	+9.89%	-2.82%	0.00%	344.5	344.5	344.5	313.5	5,149	17.738
8464	億豐	342.5	▼-24.50	-6.68%	-10.69%	8.17%	363	363	333	383	2,771	9.491
4766	南寶	340.5	▲2.50	+0.74%	3.97%	3.40%	346	351.5	340	338	1,240	4.222
2395	研華	333.5	▲3.50	+1.06%	-2.49%	1.67%	337	337.5	332	330	1,457	4.859
6789	采鈺	328	▲14.00	+4.46%	-4.65%	4.14%	326	338	325	314	3,126	10.253
5434	崇越	326	▲8.00	+2.52%	-1.06%	2.20%	324.5	330.5	323.5	318	521	1.698
7722	LINEPAY	324.5	▲8.50	+2.69%	-1.67%	2.85%	324	324.5	315.5	316	105	0.341
3413	京鼎	323.5	▲23.50	+7.83%	6.07%	5.83%	308	324	306.5	300	3,945	12.762
5386	青雲	321	▼-3.00	-0.93%	-27.21%	11.73%	332.5	340	302	324	902	2.895
6451	訊芯-KY	319	▲29.00	+10.00%	17.28%	3.10%	310	319	310	290	1,593	5.082
6903	巨漢	319	▲13.00	+4.25%	2.24%	3.59%	315	322.5	311.5	306	2,077	6.626
7792	安葆	315	▲15.00	+5.00%	-1.72%	5.17%	308.5	322	306.5	300	191	0.602
4585	達明	305	▲5.50	+1.84%	-0.97%	2.17%	309	309.5	303	299.5	109	0.332
6715	嘉基	304.5	▲27.50	+9.93%	-14.71%	0.00%	304.5	304.5	304.5	277	237	0.722
3086	華義	300.5	▼-1.00	-0.33%	6.94%	4.98%	300	309.5	294.5	301.5	145	0.436
6196	帆宣	300	▲19.50	+6.95%	6.95%	6.24%	286	303.5	286	280.5	4,728	14.184
4772	台特化	299.5	▲5.50	+1.87%	-5.22%	2.55%	300	306	298.5	294	1,402	4.199
6725	矽科宏晟	294	▲13.00	+4.63%	25.37%	11.21%	293	309	277.5	281	3,248	9.549
6415	矽力*-KY	293.5	▲11.00	+3.89%	4.63%	4.07%	293	299.5	288	282.5	5,468	16.049
6803	崑鼎	293.5	▲1.50	+0.51%	0.51%	0.34%	293	293.5	292.5	292	37	0.109
2449	京元電子	288.5	▲10.00	+3.59%	-8.70%	2.51%	286	291	284	278.5	14,313	41.293
3526	凡甲	288.5	--	--	-2.53%	1.04%	289	291.5	288.5	288.5	251	0.724
5284	jpp-KY	287.5	▲15.50	+5.70%	5.31%	5.33%	278.5	292.5	278	272	2,008	5.773
5439	高技	287	▲11.50	+4.17%	-1.54%	4.17%	281.5	293	281.5	275.5	2,481	7.120
6664	群翊	287	▲12.50	+4.55%	2.50%	3.64%	278	288	278	274.5	581	1.667
5425	台半	93	▲1.50	+1.64%	+0.54%	1.64%	91.8	93.5	91.0	91.5	2,845	5.120
`;

window.parsedMarketData = [];

// Weighted Index and key HK stock
window.parsedMarketData.push({ symbol: 'IX0001', name: '加權指數', price: 33439.11, change: 826.87, isIndex: true, prevClose: 32612.24 });
window.parsedMarketData.push({ 
    symbol: '00326', name: '中國星集團', price: 7.77, change: 0.000, prevClose: 7.77, 
    open: 7.77, high: 7.77, low: 7.77, volume: 11539000, volumeStr: '1153.9萬', turnoverAmount: '7085.87萬', 
    marketCap: '153.02億', totalShares: '24.29億', circulatingShares: '24.29億', circulatingValue: '153.02億',
    peTTM: '虧損', peStatic: '虧損', pb: 9.531, peDynamic: '--',
    turnoverRateStr: '0.48%', bidRatio: '15.79%', volumeRatio: 0.97, avgPriceStr: '7.77', amplitudeStr: '5.97%',
    high52: 7.77, low52: 1.120, historyHigh: 85947.635, historyLow: -0.025, lotSize: '2000股', lotSizeVal: 2000,
    beta: 0.421, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});
window.parsedMarketData.push({ 
    symbol: '02225', name: '今海醫療科技', price: 2.38, change: 0.00, prevClose: 2.38, 
    open: 2.38, high: 2.38, low: 2.38, volume: 100000, volumeStr: '10.0萬', turnoverAmount: '23.8萬', 
    marketCap: '--', totalShares: '--', circulatingShares: '--', circulatingValue: '--',
    peTTM: '--', peStatic: '--', pb: '--', peDynamic: '--',
    turnoverRateStr: '--', bidRatio: '--', volumeRatio: '--', avgPriceStr: '2.38', amplitudeStr: '0.00%',
    high52: 2.50, low52: 1.50, historyHigh: 3.00, historyLow: 1.00, lotSize: '5000股', lotSizeVal: 5000,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});

window.parsedMarketData.push({ 
    symbol: '01854', name: '中國萬天控股', price: 1.120, change: 0.030, prevClose: 1.090, 
    open: 1.090, high: 1.120, low: 1.090, volume: 15138000, volumeStr: '1513.8萬', turnoverAmount: '1695.4萬', 
    marketCap: '22.82億', totalShares: '20.38億', circulatingShares: '20.38億', circulatingValue: '22.82億',
    peTTM: '虧損', peStatic: '虧損', pb: 2.75, peDynamic: '--',
    turnoverRateStr: '0.74%', bidRatio: '--', volumeRatio: '--', avgPriceStr: '1.097', amplitudeStr: '2.75%',
    high52: 1.420, low52: 0.640, historyHigh: 3.435, historyLow: 0.117, lotSize: '10000股', lotSizeVal: 10000,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});


window.parsedMarketData.push({ 
    symbol: '02940', name: '經緯天地', price: 1.890, change: -3.272, prevClose: 5.162, 
    open: 3.50, high: 4.10, low: 1.80, volume: 145000, volumeStr: '14.5萬', turnoverAmount: '27.4萬', 
    marketCap: '--', totalShares: '--', circulatingShares: '--', circulatingValue: '--',
    peTTM: '--', peStatic: '--', pb: '--', peDynamic: '--',
    turnoverRateStr: '--', bidRatio: '--', volumeRatio: '--', avgPriceStr: '5.03', amplitudeStr: '0.00%',
    high52: 5.03, low52: 5.03, historyHigh: 5.03, historyLow: 5.03, lotSize: '3200股', lotSizeVal: 3200,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});

window.parsedMarketData.push({ 
    symbol: '00805', name: '新吉奧房車', price: 3.3, change: 0.00, prevClose: 3.3, 
    open: 3.3, high: 3.3, low: 3.3, volume: 0, volumeStr: '0', turnoverAmount: '0', 
    marketCap: '--', totalShares: '--', circulatingShares: '--', circulatingValue: '--',
    peTTM: '--', peStatic: '--', pb: '--', peDynamic: '--',
    turnoverRateStr: '--', bidRatio: '--', volumeRatio: '--', avgPriceStr: '3.3', amplitudeStr: '0.00%',
    high52: 3.3, low52: 3.3, historyHigh: 3.3, historyLow: 3.3, lotSize: '2000股', lotSizeVal: 2000,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});

window.parsedMarketData.push({ 
    symbol: '00918', name: '龍翼航空科技', price: 1.13, change: 0.00, prevClose: 1.13, 
    open: 1.13, high: 1.13, low: 1.13, volume: 0, volumeStr: '0', turnoverAmount: '0', 
    marketCap: '--', totalShares: '--', circulatingShares: '--', circulatingValue: '--',
    peTTM: '--', peStatic: '--', pb: '--', peDynamic: '--',
    turnoverRateStr: '--', bidRatio: '--', volumeRatio: '--', avgPriceStr: '1.13', amplitudeStr: '0.00%',
    high52: 1.13, low52: 1.13, historyHigh: 1.13, historyLow: 1.13, lotSize: '6000股', lotSizeVal: 6000,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});

window.parsedMarketData.push({ 
    symbol: '01780', name: '榮尊國際控股', price: 1.64, change: 0.00, prevClose: 1.64, 
    open: 1.64, high: 1.64, low: 1.64, volume: 0, volumeStr: '0', turnoverAmount: '0', 
    marketCap: '--', totalShares: '--', circulatingShares: '--', circulatingValue: '--',
    peTTM: '--', peStatic: '--', pb: '--', peDynamic: '--',
    turnoverRateStr: '--', bidRatio: '--', volumeRatio: '--', avgPriceStr: '1.64', amplitudeStr: '0.00%',
    high52: 1.64, low52: 1.64, historyHigh: 1.64, historyLow: 1.64, lotSize: '2500股', lotSizeVal: 2500,
    beta: 1.0, divYieldTTM: '--', divYieldLFY: '--', divYieldRateTTM: '--', divYieldRateLFY: '--',
    isStatic: true, isHK: true 
});


rawMarketData.trim().split('\n').forEach(line => {
    if(!line.trim()) return;
    const parts = line.split('\t');
    if(parts.length < 11) return;
    
    let sym = parts[0].trim();
    let name = parts[1].trim();
    let price = parseFloat(parts[2].replace(/,/g, ''));
    let changeStr = parts[3].replace(/[▲▼+]/g, '').trim();
    let change = isNaN(parseFloat(changeStr)) ? 0 : parseFloat(changeStr);
    
    // Check if it should be negative based on the arrow symbol
    if (parts[3].includes('▼') && change > 0) {
        change = -change;
    }
    
    if(!isNaN(price)) {
        let open = parseFloat(parts[7].replace(/,/g, ''));
        let high = parseFloat(parts[8].replace(/,/g, ''));
        let low = parseFloat(parts[9].replace(/,/g, ''));
        let prevClose = parseFloat(parts[10].replace(/,/g, ''));
        let volume = parseInt(parts[11].replace(/,/g, '')) || 0;
        let limitUp = prevClose * 1.1;
        let limitDown = prevClose * 0.9;
        
        // --- Selection Metadata Mocking ---
        const sectors = ['半導體', '電子零組件', 'AI概念', '航運', '金融', '生技', '光電', '通信網路'];
        const sector = sectors[Math.floor(Math.random() * sectors.length)];
        const pe = (Math.random() * 25 + 8).toFixed(1);
        const yieldValue = (Math.random() * 7).toFixed(1);
        const roe = (Math.random() * 20 + 5).toFixed(1);
        const instBuy = Math.random() > 0.8; // Institutional buy flag
        
        let status = null;
        if (Math.random() > 0.96) status = '注意';
        else if (Math.random() > 0.98) status = '處置';

        window.parsedMarketData.push({ 
            symbol: sym, name: name, price: price, change: change, 
            prevClose: prevClose, limitUp: limitUp, limitDown: limitDown,
            open: open, high: high, low: low, volume: volume,
            sector: sector, pe: pe, divYield: yieldValue, roe: roe, instBuy: instBuy,
            status: status, trades: []
        });
    }
});

// Manual categorization for key stocks
const enrichStock = (symbol, sector, isAI=false) => {
    let s = window.parsedMarketData.find(x => x.symbol === symbol);
    if(s) { 
        s.sector = sector; 
        if(isAI) s.tags = ['AI概念']; 
        if(symbol === '2330') s.divYield = '3.5';
    }
}
enrichStock('2330', '半導體', true);
enrichStock('2454', '半導體', true);
enrichStock('2317', '電子代工', true);
enrichStock('3017', '散熱', true);
enrichStock('2603', '航運');
enrichStock('2609', '航運');
enrichStock('3529', '半導體', true);
enrichStock('5274', '半導體', true);
enrichStock('5425', '半導體');
window.MockMarketEngine = {
    globalNews: [],
    globalTrend: 0,
    globalTrendTicks: 0,
    generateMacroEvent: function() {
        const events = [
            { title: "【快訊】美準會暗示降息，全球股市大舉反彈！", trend: 3.5, duration: 30, type: 'positive' },
            { title: "【突發】中東地緣政治緊張，航運股集體飆升，大盤承壓", trend: -2.0, duration: 25, type: 'negative', sector: '航運', sectorTrend: 4.5 },
            { title: "【產業】AI伺服器需求暴增，台系供應鏈全面大漲！", trend: 1.5, duration: 40, type: 'positive', sector: 'AI概念', sectorTrend: 5.0 },
            { title: "【警告】外資大舉匯出，台股跌破關鍵支撐線", trend: -4.0, duration: 35, type: 'negative' },
            { title: "【財經】主計總處大幅上修今年GDP預測", trend: 2.0, duration: 20, type: 'positive' }
        ];
        
        const evt = events[Math.floor(Math.random() * events.length)];
        this.globalTrend = evt.trend;
        this.globalTrendTicks = Math.floor(evt.duration * (Math.random() + 0.5));
        this.currentMacroEvent = evt;
        
        let t = new Date();
        this.globalNews.unshift({
            time: t.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}),
            title: evt.title,
            type: evt.type
        });
        if(this.globalNews.length > 5) this.globalNews.pop();
        
        if (typeof window.showSystemNotification === 'function') {
            window.showSystemNotification("全球總經與產業快報", evt.title);
            if (window.state && window.state.currentPage === 'home' && typeof window.renderPage === 'function') {
                setTimeout(() => window.renderPage('home'), 500); // Wait for input to defocus or just naive re-render
            }
        }
    },
    tick: function(stock) {
        if (stock.isStatic) return 0;
        let volatility = (Math.random() - 0.5) * 3.5; 
        
        if (stock.isIndex) {
            volatility = (Math.random() - 0.48) * 150; 
            
            // Randomly trigger macro event (0.5% chance per tick)
            if (Math.random() < 0.005 && (!this.globalTrendTicks || this.globalTrendTicks <= 0)) {
                this.generateMacroEvent();
            }
        }
        
        if (this.globalTrendTicks && this.globalTrendTicks > 0) {
            let applyTrend = this.globalTrend;
            if (this.currentMacroEvent && this.currentMacroEvent.sector) {
                if (stock.sector === this.currentMacroEvent.sector || (stock.tags && stock.tags.includes(this.currentMacroEvent.sector))) {
                    applyTrend = this.currentMacroEvent.sectorTrend;
                } else if (stock.isIndex) {
                    applyTrend = this.currentMacroEvent.sectorTrend * 10; // scaled for index points
                }
            } else if (stock.isIndex && this.globalTrend) {
               applyTrend = this.globalTrend * 20; // scale macro trend for index points
            }
            volatility += applyTrend;
            
            if (stock.isIndex) this.globalTrendTicks--;
        }
        
        if (stock.newsTrendTicks && stock.newsTrendTicks > 0) {
            volatility += stock.newsTrend;
            stock.newsTrendTicks--;
        }
        
        let tickSize = 0.01;
        if (stock.price >= 1000) tickSize = 5;
        else if (stock.price >= 500) tickSize = 1;
        else if (stock.price >= 100) tickSize = 0.5;
        else if (stock.price >= 50) tickSize = 0.1;
        else if (stock.price >= 10) tickSize = 0.05;
        
        let roundedDiff = Math.round(volatility / tickSize) * tickSize;
        if (roundedDiff === 0 && (!stock.newsTrendTicks || stock.newsTrendTicks === 0)) {
            roundedDiff = (Math.random() > 0.5 ? tickSize : -tickSize);
        }
        
        let newPrice = stock.price + roundedDiff;
        
        if (!stock.isIndex) {
            if (newPrice >= stock.limitUp) {
                newPrice = stock.limitUp;
                roundedDiff = newPrice - stock.price;
            } else if (newPrice <= stock.limitDown) {
                newPrice = stock.limitDown;
                roundedDiff = newPrice - stock.price;
            }
        }
        
        stock.price = newPrice;
        // Snap final price to tick size for TWSE consistency
        stock.price = Math.round(stock.price / tickSize) * tickSize;
        if (stock.price < 0.01) stock.price = 0.01;
        
        // Update High/Low
        if (stock.price > stock.high) stock.high = stock.price;
        if (stock.price < stock.low) stock.low = stock.price;
        
        stock.change = stock.price - stock.prevClose;
        
        // --- Regulatory Analytics (Phase 20) ---
        // Amplitude = (High - Low) / PrevClose
        stock.amplitude = ((stock.high - stock.low) / stock.prevClose) * 100;
        
        // Mock Float for turnover (Shares = Vol / Turnover) - Let's assume a static float for each
        if (!stock.totalFloat) stock.totalFloat = (stock.volume * 10) + 50000; 
        stock.turnoverRate = (stock.volume / stock.totalFloat) * 100;

        // Monitoring Logic (Taiwan Market Monitoring Rule 2)
        const market = window.parsedMarketData.find(s => s.symbol === 'IX0001');
        const marketAmp = market ? market.amplitude || 1 : 1.5; // Benchmark market amplitude
        const marketChange = market ? (market.change / market.prevClose) * 100 : 0.5;

        let isAnomaly = false;
        let reasons = [];

        // Condition 1: Amplitude
        if (stock.amplitude > 9 && (stock.amplitude - marketAmp > 5) && stock.volume > 3000) {
            isAnomaly = true;
            reasons.push('振幅異常 (>9% 且領先大盤)');
        }
        // Condition 2: Price Swing
        const stockChangePct = Math.abs((stock.change / stock.prevClose) * 100);
        if (stockChangePct > 6 && (stockChangePct - Math.abs(marketChange) > 4) && stock.volume > 3000) {
            isAnomaly = true;
            reasons.push('漲跌劇烈 (>6% 且領先大盤)');
        }
        // Condition 3: Turnover
        if (stock.turnoverRate > 10) {
            isAnomaly = true;
            reasons.push('周轉率極高 (>10%)');
        }

        if (isAnomaly) {
            stock.isWarning = true;
            stock.warningReason = reasons.join('、');
            // Dynamically assign Attention/Disposition if not manually set
            if (!stock.status) {
                stock.status = '注意';
                if (Math.random() > 0.7) {
                    stock.status = '處置';
                    stock.dispositionLevel = Math.random() > 0.5 ? 2 : 1;
                }
            }
        } else {
            // Gradually clear warning if conditions normalize (Optional)
            // For simulator realism, we keep the status for some time
        }

        // --- Generate Mock Trades (Time & Sales) ---
        if (!stock.trades) stock.trades = [];
        const tradeCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < tradeCount; i++) {
            const size = Math.floor(Math.random() * 20) + 1;
            const side = Math.random() > 0.5 ? 'buy' : 'sell';
            const d = new Date();
            const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
            stock.trades.unshift({ time, price: stock.price, size, side });
            stock.volume += size; // Accumulate volume
        }
        if (stock.trades.length > 35) stock.trades.length = 35;

        // Track history for SVG Chart (Keep last 100 points)
        if (!stock.priceHistory) stock.priceHistory = [];
        stock.priceHistory.push(stock.price);
        if (stock.priceHistory.length > 100) stock.priceHistory.shift();
        
        return roundedDiff;
    }
};
