import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { airKoreaService } from '@/lib/services/airkorea';
import { z } from 'zod';

const debugAirQualitySchema = z.object({
  stationName: z.string().optional(),
  sidoName: z.string().optional().default('경기'),
  numOfRows: z.string().optional().transform(val => val ? parseInt(val) : 100),
  dataTerm: z.enum(['DAILY', 'MONTH', '3MONTH']).optional().default('DAILY'),
  ver: z.enum(['1.0', '1.1', '1.2', '1.3']).optional().default('1.3'),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationName = searchParams.get('stationName');
    const sidoName = searchParams.get('sidoName');
    const numOfRows = searchParams.get('numOfRows');
    const dataTerm = searchParams.get('dataTerm') as 'DAILY' | 'MONTH' | '3MONTH' | null;
    const ver = searchParams.get('ver') as '1.0' | '1.1' | '1.2' | '1.3' | null;

    const validatedParams = debugAirQualitySchema.parse({
      stationName,
      sidoName,
      numOfRows,
      dataTerm,
      ver,
    });

    console.log('🔍 에어코리아 API 디버깅 시작');
    console.log('📋 요청 파라미터:', validatedParams);

    let apiResponse: any;
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      request: validatedParams,
      apiUrl: '',
      rawResponse: null,
      processedData: null,
      comparisonData: null,
    };

    if (validatedParams.stationName) {
      // 특정 측정소 데이터 조회
      console.log(`🏭 측정소별 데이터 조회: ${validatedParams.stationName}`);
      
      apiResponse = await airKoreaService.getRealtimeAirQuality({
        stationName: validatedParams.stationName,
        dataTerm: validatedParams.dataTerm,
        numOfRows: validatedParams.numOfRows,
        pageNo: 1,
        returnType: 'json',
        ver: validatedParams.ver,
      });
      
      debugInfo.apiUrl = `getMsrstnAcctoRltmMesureDnsty?stationName=${validatedParams.stationName}`;
    } else {
      // 시도별 데이터 조회
      console.log(`🗺️ 시도별 데이터 조회: ${validatedParams.sidoName}`);
      
      apiResponse = await airKoreaService.getSidoRealtimeAirQuality({
        sidoName: validatedParams.sidoName,
        numOfRows: validatedParams.numOfRows,
        pageNo: 1,
        returnType: 'json',
        ver: validatedParams.ver,
      });
      
      debugInfo.apiUrl = `getCtprvnRltmMesureDnsty?sidoName=${validatedParams.sidoName}`;
    }

    // 원본 응답 저장
    debugInfo.rawResponse = apiResponse;

    // 운정 측정소 데이터 특별 처리
    let unjeongData = null;
    if (apiResponse.response.header.resultCode === '00') {
      const items = apiResponse.response.body.items;
      
      // 운정 측정소 찾기
      unjeongData = items.find((item: any) => 
        item.stationName === '운정' || 
        item.stationName?.includes('운정')
      );
      
      console.log('🎯 운정 측정소 데이터 확인:', unjeongData);
      
      // 모든 측정소 데이터 요약
      const stationSummary = items.map((item: any) => ({
        stationName: item.stationName,
        dataTime: item.dataTime,
        pm10Value: item.pm10Value,
        pm25Value: item.pm25Value,
        pm10Value24: item.pm10Value24,
        pm25Value24: item.pm25Value24,
        pm10Grade: item.pm10Grade,
        pm25Grade: item.pm25Grade,
      }));
      
      debugInfo.processedData = {
        totalCount: items.length,
        stationSummary: stationSummary.slice(0, 10), // 처음 10개만
        unjeongStation: unjeongData,
      };
    }

    // 비교 데이터 생성
    if (unjeongData) {
      debugInfo.comparisonData = {
        webSiteValues: {
          pm10: 21,
          pm25: 9,
          timestamp: '12:00 기준',
        },
        apiValues: {
          pm10: parseInt(unjeongData.pm10Value || '0'),
          pm25: parseInt(unjeongData.pm25Value || '0'),
          pm10_24h: parseInt(unjeongData.pm10Value24 || '0'),
          pm25_24h: parseInt(unjeongData.pm25Value24 || '0'),
          dataTime: unjeongData.dataTime,
          grade10: unjeongData.pm10Grade,
          grade25: unjeongData.pm25Grade,
        },
        differences: {
          pm10_diff: 21 - parseInt(unjeongData.pm10Value || '0'),
          pm25_diff: 9 - parseInt(unjeongData.pm25Value || '0'),
        },
        possibleCauses: [
          '데이터 업데이트 시간 차이',
          'API 버전 차이 (현재: ' + validatedParams.ver + ')',
          '웹사이트와 API의 데이터 소스 차이',
          '캐싱으로 인한 지연',
          '측정소명 매칭 문제',
        ]
      };
    }

    // 다른 API 버전으로 테스트
    const versionTests = [];
    for (const version of ['1.0', '1.1', '1.2', '1.3'] as const) {
      if (version !== validatedParams.ver) {
        try {
          console.log(`🔄 API 버전 ${version} 테스트 중...`);
          
          const versionResponse = validatedParams.stationName 
            ? await airKoreaService.getRealtimeAirQuality({
                stationName: validatedParams.stationName,
                dataTerm: validatedParams.dataTerm,
                numOfRows: 10,
                pageNo: 1,
                returnType: 'json',
                ver: version,
              })
            : await airKoreaService.getSidoRealtimeAirQuality({
                sidoName: validatedParams.sidoName,
                numOfRows: 10,
                pageNo: 1,
                returnType: 'json',
                ver: version,
              });

          const versionUnjeongData = versionResponse.response.body.items.find((item: any) => 
            item.stationName === '운정' || item.stationName?.includes('운정')
          );

          versionTests.push({
            version,
            success: true,
            unjeongData: versionUnjeongData ? {
              pm10Value: versionUnjeongData.pm10Value,
              pm25Value: versionUnjeongData.pm25Value,
              dataTime: versionUnjeongData.dataTime,
            } : null,
          });
        } catch (error) {
          versionTests.push({
            version,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    debugInfo.versionTests = versionTests;

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations: [
        'API 버전 1.3을 사용하여 최신 데이터 확인',
        '웹사이트와 API의 데이터 업데이트 시간 비교',
        '다른 측정소와의 데이터 일관성 확인',
        '캐시 무효화 후 재시도',
        'pm10Value24, pm25Value24 필드 활용 고려',
      ],
    });
  } catch (error) {
    console.error('에어코리아 API 디버깅 실패:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: '에어코리아 API 디버깅에 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}